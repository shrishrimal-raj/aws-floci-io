import { lakePrefix, type S3Partition } from "./data-lake.js";
import { tenantCacheKey, type CacheClient } from "./postgres-cache.js";

export interface AuditEvent {
  actorId: string;
  tenantId: string;
  action: string;
  resource: string;
  outcome: "attempt" | "success" | "failure";
  requestId?: string;
  reason?: string;
  at?: string;
}

export interface AuditSink {
  write(event: AuditEvent): Promise<void>;
}

export interface MetricsSink {
  putMetric(name: string, value: number, dimensions?: Record<string, string>): Promise<void>;
}

export interface RetryOptions {
  retries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  jitterRatio?: number;
  random?: () => number;
  sleep?: (ms: number) => Promise<void>;
  shouldRetry?: (error: unknown, attempt: number) => boolean;
  onRetry?: (error: unknown, attempt: number, delayMs: number) => void;
}

export interface TenantActor {
  actorId: string;
  tenantId: string;
  roles: string[];
}

export interface DataLifecycleRule {
  id: string;
  prefix: string;
  transitionToIaDays: number;
  expirationDays: number;
  noncurrentVersionExpirationDays?: number;
}

export interface BackupPlan {
  resource: string;
  rpoMinutes: number;
  rtoMinutes: number;
  copyToRegion?: string;
  encrypted: boolean;
  pointInTimeRecovery: boolean;
}

export interface ComplianceTagsInput {
  owner: string;
  dataClassification: "public" | "internal" | "confidential" | "restricted";
  retentionDays: number;
  costCenter: string;
}

export interface BusinessEvent {
  eventId: string;
  tenantId: string;
  eventType: string;
  occurredAt: string;
  payload: Record<string, unknown>;
}

export interface DashboardSqlInput {
  tableName: string;
  tenantId: string;
  eventType: string;
  partition: S3Partition;
  metricColumn?: string;
}

/**
 * Enforces tenant isolation before repository/search/cache calls.
 * Example: API handler checks JWT tenant before reading product tenant data.
 */
export function assertTenantAccess(actor: TenantActor, resourceTenantId: string, requiredRole = "reader"): void {
  if (actor.tenantId !== resourceTenantId) throw new Error("tenant access denied");
  if (!actor.roles.includes(requiredRole) && !actor.roles.includes("admin")) throw new Error("role access denied");
}

/**
 * Wraps any data operation with attempt/success/failure audit events.
 * Example: write immutable audit events to CloudWatch Logs, Firehose, or DynamoDB stream.
 */
export async function withAuditLog<T>(sink: AuditSink, event: Omit<AuditEvent, "outcome" | "at">, operation: () => Promise<T>): Promise<T> {
  await sink.write({ ...event, outcome: "attempt", at: new Date().toISOString() });
  try {
    const result = await operation();
    await sink.write({ ...event, outcome: "success", at: new Date().toISOString() });
    return result;
  } catch (error) {
    await sink.write({ ...event, outcome: "failure", reason: error instanceof Error ? error.message : String(error), at: new Date().toISOString() });
    throw error;
  }
}

/**
 * Adds exponential backoff retry for transient AWS/OpenSearch/Postgres operations.
 * Example: retry 429/5xx OpenSearch index writes without retrying validation errors.
 */
export async function retryWithBackoff<T>(operation: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const retries = options.retries ?? 3;
  const baseDelayMs = options.baseDelayMs ?? 100;
  const maxDelayMs = options.maxDelayMs ?? 2_000;
  const jitterRatio = options.jitterRatio ?? 0.2;
  const random = options.random ?? Math.random;
  const sleep = options.sleep ?? ((ms) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  const shouldRetry = options.shouldRetry ?? (() => true);

  for (let attempt = 0; ; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt >= retries || !shouldRetry(error, attempt)) throw error;
      const exponentialDelay = Math.min(maxDelayMs, baseDelayMs * 2 ** attempt);
      const delayMs = Math.round(exponentialDelay + exponentialDelay * jitterRatio * random());
      options.onRetry?.(error, attempt + 1, delayMs);
      await sleep(delayMs);
    }
  }
}

/**
 * Emits duration and success/failure metrics around business operations.
 * Example: publish DashboardQueryLatencyMs and DashboardQueryFailure to CloudWatch EMF.
 */
export async function instrumentAsync<T>(name: string, sink: MetricsSink, operation: () => Promise<T>, dimensions: Record<string, string> = {}): Promise<T> {
  const started = Date.now();
  try {
    const result = await operation();
    await sink.putMetric(`${name}LatencyMs`, Date.now() - started, { ...dimensions, status: "success" });
    return result;
  } catch (error) {
    await sink.putMetric(`${name}Failure`, 1, { ...dimensions, status: "failure" });
    await sink.putMetric(`${name}LatencyMs`, Date.now() - started, { ...dimensions, status: "failure" });
    throw error;
  }
}

/**
 * Escapes string literals for Athena SQL examples where SDK parameter binding is unavailable.
 * Example: tenant id `acme's` becomes `'acme''s'` instead of breaking query syntax.
 */
export function sqlLiteral(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

/**
 * Builds tenant-scoped dashboard SQL with mandatory date partitions for Athena cost control.
 * Example: BI dashboard counts checkout events for one tenant/day without scanning full lake.
 */
export function buildPartitionedDashboardSql(input: DashboardSqlInput): string {
  const metric = input.metricColumn ?? "event_id";
  return [
    `SELECT count(${metric}) AS total_events`,
    `FROM ${input.tableName}`,
    `WHERE tenant_id = ${sqlLiteral(input.tenantId)}`,
    `AND event_type = ${sqlLiteral(input.eventType)}`,
    `AND year = ${sqlLiteral(input.partition.year)}`,
    `AND month = ${sqlLiteral(input.partition.month)}`,
    `AND day = ${sqlLiteral(input.partition.day)}`,
  ].join("\n");
}

/**
 * Converts event timestamp to lake partition prefix.
 * Example: checkout event lands in bronze S3 prefix before Glue/Athena processing.
 */
export function eventLakePrefix(layer: "bronze" | "silver" | "gold", event: BusinessEvent): string {
  const date = new Date(event.occurredAt);
  const partition = {
    tenantId: event.tenantId,
    year: String(date.getUTCFullYear()),
    month: String(date.getUTCMonth() + 1).padStart(2, "0"),
    day: String(date.getUTCDate()).padStart(2, "0"),
  };
  return lakePrefix(layer, event.eventType, partition);
}

/**
 * Produces cache keys to invalidate after product lifecycle mutations.
 * Example: product update evicts product cache plus tenant dashboard aggregates.
 */
export function productInvalidationKeys(tenantId: string, productId: string, dashboardIds: string[] = []): string[] {
  return [tenantCacheKey(tenantId, "product", productId), ...dashboardIds.map((dashboardId) => tenantCacheKey(tenantId, "dashboard", `${dashboardId}:*`))];
}

/**
 * Deletes cache keys when backend supports deletion, otherwise returns skipped count.
 * Example: after RDS product write, clear Redis product/dashboard keys before publishing event.
 */
export async function invalidateCache(cache: CacheClient, keys: string[]): Promise<number> {
  if (!cache.del) return 0;
  let removed = 0;
  for (const key of keys) removed += await cache.del(key);
  return removed;
}

/**
 * Defines S3 lifecycle defaults for cost optimization and retention compliance.
 * Example: bronze raw events transition to IA after 30 days and expire after 400 days.
 */
export function dataLifecycleRule(prefix: string, retentionDays: number, transitionToIaDays = 30): DataLifecycleRule {
  return {
    id: `lifecycle-${prefix.replace(/[^a-z0-9-]/gi, "-")}`,
    prefix,
    transitionToIaDays,
    expirationDays: retentionDays,
    noncurrentVersionExpirationDays: Math.min(90, retentionDays),
  };
}

/**
 * Captures backup/DR intent for RDS/OpenSearch/ElastiCache designs.
 * Example: RDS PITR with cross-region copy for regulated production tenants.
 */
export function backupPlan(input: Omit<BackupPlan, "encrypted" | "pointInTimeRecovery"> & Partial<Pick<BackupPlan, "encrypted" | "pointInTimeRecovery">>): BackupPlan {
  return { encrypted: true, pointInTimeRecovery: true, ...input };
}

/**
 * Standardizes compliance and cost allocation tags across AWS resources.
 * Example: apply tags to RDS clusters, OpenSearch domains, S3 buckets, and Glue databases.
 */
export function complianceTags(input: ComplianceTagsInput): Record<string, string> {
  return {
    Owner: input.owner,
    DataClassification: input.dataClassification,
    RetentionDays: String(input.retentionDays),
    CostCenter: input.costCenter,
    ManagedBy: "phase-05-data-search-cache",
  };
}
