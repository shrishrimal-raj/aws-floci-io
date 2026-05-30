import type { CloudWatchLogsClient } from "@aws-sdk/client-cloudwatch-logs";
import { appLogGroupName, putRetentionDays, structuredLog } from "./logs.js";

export interface RetryPolicy {
  maxAttempts: number;
  baseDelayMs: number;
  backoffRate: number;
  retryableErrors?: string[];
}

export interface LogAuditEntry {
  eventId: string;
  actor: string;
  action: string;
  logGroupName: string;
  outcome: "ALLOW" | "DENY" | "ERROR";
  at: string;
  metadata?: Record<string, unknown>;
}

export interface MetricFilterPlan {
  filterName: string;
  logGroupName: string;
  filterPattern: string;
  metricNamespace: string;
  metricName: string;
  metricValue: string;
  alarmThreshold: number;
}

export interface SubscriptionPlan {
  filterName: string;
  logGroupName: string;
  destinationArn: string;
  filterPattern: string;
  roleArn?: string;
  targetService: "lambda" | "firehose" | "opensearch" | "kinesis";
}

export interface LogLifecyclePlan {
  logGroupName: string;
  retentionDays: number;
  exportToS3: boolean;
  piiRedactionRequired: boolean;
  owner: string;
  classification: "public" | "internal" | "confidential" | "restricted";
}

export interface LogCostPlan {
  logGroupName: string;
  estimatedIngestGbPerDay: number;
  retentionDays: number;
  samplingRecommended: boolean;
  optimizationTips: string[];
}

export interface LogDisasterRecoveryPlan {
  sourceLogGroup: string;
  exportBucket: string;
  backupRegion: string;
  restoreRunbook: string[];
  rpoHours: number;
  rtoHours: number;
}

/**
 * Retries idempotent CloudWatch Logs operations with exponential backoff.
 * Example: wrap retention updates, log delivery, or filter creation during throttling bursts.
 */
export async function withCloudWatchLogsRetry<T>(operation: () => Promise<T>, policy: RetryPolicy): Promise<T> {
  let attempt = 0;
  let lastError: unknown;

  while (attempt < policy.maxAttempts) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      attempt += 1;
      const name = error instanceof Error ? error.name : "UnknownError";
      const canRetry = !policy.retryableErrors || policy.retryableErrors.includes(name);
      if (attempt >= policy.maxAttempts || !canRetry) break;
      const delayMs = Math.round(policy.baseDelayMs * policy.backoffRate ** (attempt - 1));
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw lastError;
}

/**
 * Builds audit event for CloudWatch Logs management/data access.
 * Example: record who changed retention, created subscription filters, or queried sensitive logs.
 */
export function buildLogAuditEntry(input: Omit<LogAuditEntry, "at"> & { at?: string }): LogAuditEntry {
  return { ...input, at: input.at ?? new Date().toISOString() };
}

/**
 * Builds least-privilege resource policy shape for log-group access.
 * Example: allow central observability account to read only `/aws/app/orders-api/prod*` groups.
 */
export function logGroupReadPolicy(logGroupPrefix: string, region: string, accountId: string, principalArn: string): Record<string, unknown> {
  const normalized = logGroupPrefix.replace(/:\*$/, "");
  return {
    Version: "2012-10-17",
    Statement: [
      {
        Sid: "ReadScopedLogGroups",
        Effect: "Allow",
        Principal: { AWS: principalArn },
        Action: ["logs:DescribeLogStreams", "logs:FilterLogEvents", "logs:GetLogEvents"],
        Resource: `arn:aws:logs:${region}:${accountId}:log-group:${normalized}*`,
      },
    ],
  };
}

/**
 * Redacts sensitive fields before writing JSON logs.
 * Example: remove tokens, passwords, and card values while preserving request IDs for debugging.
 */
export function redactSensitiveFields<T extends Record<string, unknown>>(record: T, fields = ["password", "token", "authorization", "creditCard"]): Record<string, unknown> {
  const sensitive = new Set(fields.map((field) => field.toLowerCase()));
  return Object.fromEntries(Object.entries(record).map(([key, value]) => [key, sensitive.has(key.toLowerCase()) ? "[REDACTED]" : value]));
}

/**
 * Creates metric-filter plan for operations dashboards and alarms.
 * Example: count `ERROR` logs for payments API and alarm when count exceeds threshold.
 */
export function metricFilterPlan(input: MetricFilterPlan): MetricFilterPlan {
  return input;
}

/**
 * Creates subscription-filter plan for event-driven log processing.
 * Example: stream security/audit logs to Firehose/S3 or Lambda redaction pipeline.
 */
export function subscriptionFilterPlan(input: SubscriptionPlan): SubscriptionPlan {
  return input;
}

/**
 * Builds lifecycle plan for retention, export, ownership, and data classification.
 * Example: regulated audit logs retain 365 days and export to S3; dev logs retain 7 days.
 */
export function logLifecyclePlan(app: string, environment: string, regulated = false): LogLifecyclePlan {
  return {
    logGroupName: appLogGroupName(app, environment),
    retentionDays: regulated ? 365 : environment === "prod" ? 30 : 7,
    exportToS3: regulated,
    piiRedactionRequired: regulated,
    owner: `${app}-team`,
    classification: regulated ? "restricted" : "internal",
  };
}

/**
 * Applies lifecycle retention to CloudWatch Logs.
 * Example: platform job enforces retention across all app log groups nightly.
 */
export async function enforceLogRetention(plan: LogLifecyclePlan, logs?: CloudWatchLogsClient): Promise<void> {
  await (logs ? putRetentionDays(plan.logGroupName, plan.retentionDays, logs) : putRetentionDays(plan.logGroupName, plan.retentionDays));
}

/**
 * Creates cost optimization plan for ingestion and retention.
 * Example: high-volume debug logs should sample, reduce retention, and route raw archives to S3.
 */
export function logCostOptimizationPlan(logGroupName: string, estimatedIngestGbPerDay: number, retentionDays: number): LogCostPlan {
  return {
    logGroupName,
    estimatedIngestGbPerDay,
    retentionDays,
    samplingRecommended: estimatedIngestGbPerDay > 10,
    optimizationTips: [
      "Emit structured logs and filter high-cardinality debug fields.",
      "Reduce retention for non-prod and high-volume debug groups.",
      "Use subscription filters to archive raw logs to S3/Firehose for cheaper long-term analytics.",
      "Create metric filters for counts instead of querying raw logs repeatedly.",
    ],
  };
}

/**
 * Builds disaster-recovery plan for log export and restore workflows.
 * Example: export regulated audit log groups to encrypted S3 and replicate bucket cross-region.
 */
export function logDisasterRecoveryPlan(app: string, environment: string, backupRegion: string): LogDisasterRecoveryPlan {
  const sourceLogGroup = appLogGroupName(app, environment);
  return {
    sourceLogGroup,
    exportBucket: `${app}-${environment}-cloudwatch-logs-backup-${backupRegion}`.toLowerCase(),
    backupRegion,
    restoreRunbook: [
      `Export ${sourceLogGroup} to encrypted S3 on schedule.`,
      "Replicate backup bucket cross-region with versioning enabled.",
      "Restore by querying S3/Athena or rehydrating into incident workspace.",
      "Validate audit log continuity after regional failover.",
    ],
    rpoHours: 24,
    rtoHours: 4,
  };
}

/**
 * Builds complete enterprise log event with redaction and audit-friendly fields.
 * Example: API logs request outcome with tenant/correlation IDs and redacted auth token.
 */
export function enterpriseApplicationLog(level: string, message: string, fields: Record<string, unknown>): Record<string, unknown> {
  return structuredLog(level, message, redactSensitiveFields(fields));
}
