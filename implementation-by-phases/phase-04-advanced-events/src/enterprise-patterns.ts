import type { DomainEvent } from "./domain-events.js";

export interface RetryPolicy {
  maxAttempts: number;
  baseDelayMs: number;
  backoffRate: number;
  retryableErrors?: string[];
}

export interface AuditLogEntry {
  eventId: string;
  tenantId: string;
  actor: string;
  action: string;
  resource: string;
  outcome: "ALLOW" | "DENY" | "ERROR";
  at: string;
  correlationId: string;
  metadata?: Record<string, unknown>;
}

export interface LifecyclePolicy {
  hotRetentionDays: number;
  archiveAfterDays: number;
  purgeAfterDays: number;
  replayEnabled: boolean;
}

export interface ObservabilityEnvelope<T = unknown> {
  correlationId: string;
  service: string;
  eventType: string;
  tenantId: string;
  payload: T;
  metrics: Record<string, number>;
  dimensions: Record<string, string>;
}

export interface ComplianceTagSet {
  dataClassification: "public" | "internal" | "confidential" | "restricted";
  retentionClass: "short-lived" | "standard" | "regulated";
  pii: boolean;
  owner: string;
  costCenter: string;
}

export interface DisasterRecoveryPlan {
  eventBusArchiveName: string;
  replayWindowDays: number;
  crossRegionStreamName: string;
  backupVaultName: string;
  rpoMinutes: number;
  rtoMinutes: number;
}

export interface SecureEventAccessPolicyInput {
  tenantId: string;
  principalArn: string;
  eventBusArn: string;
  allowedSources: string[];
}

/**
 * Runs async event-handler work with exponential backoff.
 *
 * Practical use: wrap idempotent EventBridge, Kinesis, or Firehose writes that may fail on
 * throttling. Non-retryable validation/security failures should be excluded with
 * `retryableErrors` so bad messages move to DLQ quickly.
 */
export async function withEnterpriseRetry<T>(operation: () => Promise<T>, policy: RetryPolicy): Promise<T> {
  let attempt = 0;
  let lastError: unknown;

  while (attempt < policy.maxAttempts) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      attempt += 1;
      const errorName = error instanceof Error ? error.name : "UnknownError";
      const canRetry = !policy.retryableErrors || policy.retryableErrors.includes(errorName);
      if (attempt >= policy.maxAttempts || !canRetry) break;
      const delay = Math.round(policy.baseDelayMs * policy.backoffRate ** (attempt - 1));
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * Creates append-only audit record for event-driven access decisions.
 *
 * Practical use: write output to Firehose/S3 or CloudWatch Logs whenever sensitive events are
 * published, consumed, replayed, denied, or redriven from DLQ.
 */
export function buildAuditLogEntry(input: Omit<AuditLogEntry, "at"> & { at?: string }): AuditLogEntry {
  return { ...input, at: input.at ?? new Date().toISOString() };
}

/**
 * Builds EventBridge-compatible IAM condition policy for tenant-scoped publishers.
 *
 * Practical use: grant one SaaS tenant integration role only permission to publish approved
 * sources and tag every event with tenant detail for downstream authorization.
 */
export function secureEventAccessPolicy(input: SecureEventAccessPolicyInput): Record<string, unknown> {
  return {
    Version: "2012-10-17",
    Statement: [
      {
        Sid: "AllowTenantScopedPutEvents",
        Effect: "Allow",
        Principal: { AWS: input.principalArn },
        Action: "events:PutEvents",
        Resource: input.eventBusArn,
        Condition: {
          StringEquals: { "events:source": input.allowedSources },
          "ForAllValues:StringEquals": { "aws:PrincipalTag/tenantId": input.tenantId },
        },
      },
    ],
  };
}

/**
 * Defines hot/archive/purge lifecycle for high-volume event data.
 *
 * Practical use: configure CloudWatch Logs retention, EventBridge archive retention, S3
 * lifecycle rules, and compliance purge jobs from one source-of-truth policy.
 */
export function buildLifecyclePolicy(regulated: boolean): LifecyclePolicy {
  return regulated
    ? { hotRetentionDays: 90, archiveAfterDays: 30, purgeAfterDays: 2555, replayEnabled: true }
    : { hotRetentionDays: 14, archiveAfterDays: 7, purgeAfterDays: 365, replayEnabled: true };
}

/**
 * Wraps domain event with observability metadata for logs and metrics.
 *
 * Practical use: every handler logs this envelope once, emits metrics from `metrics`, and uses
 * dimensions for dashboards/alarms by tenant, service, event type, and outcome.
 */
export function observabilityEnvelope<T>(event: DomainEvent<T>, service: string, metrics: Record<string, number> = {}): ObservabilityEnvelope<DomainEvent<T>> {
  return {
    correlationId: event.id,
    service,
    eventType: event.type,
    tenantId: event.tenantId,
    payload: event,
    metrics,
    dimensions: { tenantId: event.tenantId, eventType: event.type, source: event.source, service },
  };
}

/**
 * Creates compliance tags used by event stores, streams, archives, and queues.
 *
 * Practical use: enforce cost allocation, ownership, retention, and PII controls through IaC
 * policy checks before production deployment.
 */
export function complianceTags(input: ComplianceTagSet): Record<string, string> {
  return {
    DataClassification: input.dataClassification,
    RetentionClass: input.retentionClass,
    ContainsPII: String(input.pii),
    Owner: input.owner,
    CostCenter: input.costCenter,
  };
}

/**
 * Estimates shard count needed for Kinesis write throughput.
 *
 * Practical use: set stream shard count and alarms before launch. One shard supports roughly
 * 1,000 records/sec or 1 MiB/sec writes; this function chooses larger requirement.
 */
export function estimateKinesisShards(recordsPerSecond: number, avgRecordBytes: number): number {
  const byRecords = Math.ceil(recordsPerSecond / 1000);
  const byBytes = Math.ceil((recordsPerSecond * avgRecordBytes) / 1_048_576);
  return Math.max(1, byRecords, byBytes);
}

/**
 * Designs backup/replay target names for event-driven disaster recovery.
 *
 * Practical use: document RPO/RTO and create matching EventBridge archives, cross-region
 * stream replication, and AWS Backup vaults for stateful event processors.
 */
export function buildDisasterRecoveryPlan(service: string, environment: string): DisasterRecoveryPlan {
  const prefix = `${service}-${environment}`.replace(/[^a-zA-Z0-9-]/g, "-").toLowerCase();
  return {
    eventBusArchiveName: `${prefix}-event-archive`,
    replayWindowDays: 30,
    crossRegionStreamName: `${prefix}-replica-stream`,
    backupVaultName: `${prefix}-backup-vault`,
    rpoMinutes: 15,
    rtoMinutes: 60,
  };
}
