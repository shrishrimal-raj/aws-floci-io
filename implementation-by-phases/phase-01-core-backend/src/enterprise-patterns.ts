import type { Task, TaskStatus } from "./taskflow-model.js";

/** Outcome recorded in enterprise audit trails. */
export type AuditOutcome = "success" | "denied" | "failed";

/** Lifecycle state used by data-retention jobs. */
export type LifecycleDecision = "retain" | "archive" | "delete";

/** Common request context passed through API, events, logs, and audit records. */
export interface EnterpriseRequestContext {
  tenantId: string;
  principalId: string;
  requestId: string;
  sourceIp?: string;
  userAgent?: string;
}

/** Immutable audit event shape suitable for CloudWatch Logs, S3 archive, or SIEM export. */
export interface AuditEvent {
  tenantId: string;
  principalId: string;
  requestId: string;
  action: string;
  resource: string;
  outcome: AuditOutcome;
  occurredAt: string;
  details?: Record<string, unknown>;
}

/** Retry policy for transient AWS/network failures. */
export interface RetryPolicy {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  retryableErrorNames?: string[];
}

/** Task retention rules used by compliance and cost-control jobs. */
export interface TaskLifecyclePolicy {
  archiveDoneAfterDays: number;
  deleteDoneAfterDays: number;
}

/**
 * Ensures caller can only access own tenant data.
 *
 * Example: API Gateway authorizer maps JWT tenant claim to `principalTenantId`; handler rejects cross-tenant route params before DynamoDB read.
 */
export function assertTenantAccess(requestedTenantId: string, principalTenantId: string): void {
  if (requestedTenantId !== principalTenantId) {
    throw new Error(`Tenant access denied: principal cannot access ${requestedTenantId}`);
  }
}

/**
 * Builds consistent audit events for security reviews and compliance exports.
 *
 * Example: write returned event to CloudWatch Logs on every create/update/delete so SOC tooling can answer who changed which task.
 */
export function createAuditEvent(
  context: EnterpriseRequestContext,
  action: string,
  resource: string,
  outcome: AuditOutcome,
  details?: Record<string, unknown>,
  now = new Date()
): AuditEvent {
  return {
    tenantId: context.tenantId,
    principalId: context.principalId,
    requestId: context.requestId,
    action,
    resource,
    outcome,
    occurredAt: now.toISOString(),
    details,
  };
}

/**
 * Redacts sensitive fields before logging or returning diagnostic payloads.
 *
 * Example: call before `CloudWatchJsonLogger.put` to avoid leaking tokens, passwords, and API keys into long-retention logs.
 */
export function redactForLog<T extends Record<string, unknown>>(
  input: T,
  sensitiveKeys = ["password", "token", "secret", "authorization", "apiKey"]
): Record<string, unknown> {
  const blocked = new Set(sensitiveKeys.map((key) => key.toLowerCase()));
  return Object.fromEntries(
    Object.entries(input).map(([key, value]) => [key, blocked.has(key.toLowerCase()) ? "[REDACTED]" : value])
  );
}

/**
 * Retries transient operations with capped exponential backoff.
 *
 * Example: wrap SNS publish or SQS enqueue so brief LocalStack/Floci/network hiccups do not fail user-facing task creation.
 */
export async function withRetry<T>(operation: () => Promise<T>, policy: RetryPolicy): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= policy.maxAttempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt === policy.maxAttempts || !isRetryable(error, policy.retryableErrorNames)) break;
      await delay(backoffMs(attempt, policy));
    }
  }
  throw lastError;
}

/**
 * Creates status-change event payloads for downstream processors.
 *
 * Example: publish this after `TaskRepository.markStatus` so notification, search-index, and analytics consumers can work independently.
 */
export function taskStatusChangedEventPayload(previousStatus: TaskStatus, nextStatus: TaskStatus): Record<string, unknown> {
  return { previousStatus, nextStatus };
}

/**
 * Decides whether a completed task should stay hot, move to archive storage, or be deleted.
 *
 * Example: nightly compliance job scans done tasks, archives after 90 days, deletes after 2555 days for seven-year retention.
 */
export function decideTaskLifecycle(task: Task, policy: TaskLifecyclePolicy, now = new Date()): LifecycleDecision {
  if (task.status !== "done") return "retain";
  const ageDays = Math.floor((now.getTime() - new Date(task.updatedAt).getTime()) / 86_400_000);
  if (ageDays >= policy.deleteDoneAfterDays) return "delete";
  if (ageDays >= policy.archiveDoneAfterDays) return "archive";
  return "retain";
}

function isRetryable(error: unknown, retryableErrorNames: string[] = ["ThrottlingException", "TooManyRequestsException", "TimeoutError"]): boolean {
  if (!(error instanceof Error)) return false;
  return retryableErrorNames.some((name) => error.name.includes(name) || error.message.includes(name));
}

function backoffMs(attempt: number, policy: RetryPolicy): number {
  const exponential = policy.baseDelayMs * 2 ** (attempt - 1);
  return Math.min(exponential, policy.maxDelayMs);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
