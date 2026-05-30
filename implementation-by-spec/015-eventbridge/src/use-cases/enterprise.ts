import type { EventBridgeClient } from "@aws-sdk/client-eventbridge";
import { publishEvent, publishEvents, putTarget, type AppEvent } from "./events.js";

export interface TenantActor {
  tenantId: string;
  principalId: string;
  roles: string[];
  requestId: string;
}

export interface EnterpriseEventDetail<TDetail> {
  tenantId: string;
  eventId: string;
  occurredAt: string;
  schemaVersion: string;
  correlationId: string;
  producer: string;
  detail: TDetail;
}

export interface EnterpriseEventInput<TDetail> {
  eventBusName: string;
  source: string;
  detailType: string;
  tenantId: string;
  producer: string;
  detail: TDetail;
  eventId?: string;
  occurredAt?: string;
  schemaVersion?: string;
  correlationId?: string;
}

export interface AuditEventDetail {
  tenantId: string;
  principalId: string;
  action: string;
  resource: string;
  outcome: "attempt" | "success" | "failure" | "denied";
  reason?: string;
  requestId: string;
}

export interface RetryOptions {
  attempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  jitterRatio?: number;
  random?: () => number;
  sleep?: (ms: number) => Promise<void>;
  shouldRetry?: (error: unknown, attempt: number) => boolean;
  onRetry?: (error: unknown, attempt: number, delayMs: number) => void;
}

export interface ArchiveLifecyclePlan {
  eventBusName: string;
  archiveName: string;
  retentionDays: number;
  replayWindowDays: number;
  reason: string;
}

export interface EventBridgeObservabilityPlan {
  service: string;
  metrics: string[];
  alarms: string[];
  logFields: string[];
}

export interface EventBridgeCostEstimate {
  eventCount: number;
  putEventsRequests: number;
  estimatedPutEventsCostUsd: number;
}

const MAX_PUT_EVENTS_BATCH_SIZE = 10;

/**
 * Enforces tenant and role checks before publishing or routing business events.
 * Example: tenant-a order API cannot publish tenant-b `order.cancelled` events.
 */
export function assertTenantAccess(actor: TenantActor, resourceTenantId: string, requiredRole = "publisher"): void {
  if (actor.tenantId !== resourceTenantId) throw new Error("tenant access denied");
  if (!actor.roles.includes(requiredRole) && !actor.roles.includes("admin")) throw new Error("role access denied");
}

/**
 * Creates a standard event envelope with tenant, schema, correlation, and producer metadata.
 * Example: order service wraps raw order payload before publishing `com.acme.orders/order.created`.
 */
export function enterpriseEvent<TDetail>(input: EnterpriseEventInput<TDetail>): AppEvent<EnterpriseEventDetail<TDetail>> {
  return {
    eventBusName: input.eventBusName,
    source: input.source,
    detailType: input.detailType,
    detail: {
      tenantId: input.tenantId,
      eventId: input.eventId ?? `${input.tenantId}-${Date.now()}`,
      occurredAt: input.occurredAt ?? new Date().toISOString(),
      schemaVersion: input.schemaVersion ?? "1.0",
      correlationId: input.correlationId ?? input.eventId ?? `${input.tenantId}-${Date.now()}`,
      producer: input.producer,
      detail: input.detail,
    },
  };
}

/**
 * Builds audit events that can be sent to an audit bus, Firehose target, or security account.
 * Example: access denied and publish success outcomes become immutable security evidence.
 */
export function auditEvent(actor: TenantActor, eventBusName: string, action: string, resource: string, outcome: AuditEventDetail["outcome"], reason?: string): AppEvent<EnterpriseEventDetail<AuditEventDetail>> {
  return enterpriseEvent({
    eventBusName,
    source: "com.enterprise.audit",
    detailType: "audit.recorded",
    tenantId: actor.tenantId,
    producer: "eventbridge-audit",
    correlationId: actor.requestId,
    detail: { tenantId: actor.tenantId, principalId: actor.principalId, action, resource, outcome, reason, requestId: actor.requestId },
  });
}

/**
 * Wraps transient EventBridge calls in exponential backoff with jitter.
 * Example: retry throttled PutEvents calls but surface validation/authorization failures immediately.
 */
export async function retryWithBackoff<T>(operation: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const attempts = options.attempts ?? 3;
  const baseDelayMs = options.baseDelayMs ?? 100;
  const maxDelayMs = options.maxDelayMs ?? 2_000;
  const jitterRatio = options.jitterRatio ?? 0.2;
  const random = options.random ?? Math.random;
  const sleep = options.sleep ?? ((ms) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  const shouldRetry = options.shouldRetry ?? ((error) => ["ThrottlingException", "TooManyRequestsException", "InternalFailure", "ServiceUnavailableException"].some((name) => String(error).includes(name)));

  for (let attempt = 1; ; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt >= attempts || !shouldRetry(error, attempt)) throw error;
      const delayMs = Math.round(Math.min(maxDelayMs, baseDelayMs * 2 ** (attempt - 1)) * (1 + jitterRatio * random()));
      options.onRetry?.(error, attempt, delayMs);
      await sleep(delayMs);
    }
  }
}

/**
 * Publishes one enterprise event after tenant authorization, with retry and audit-friendly envelope.
 * Example: checkout service publishes `order.created` to a custom bus after RBAC passes.
 */
export async function publishEnterpriseEvent<TDetail>(actor: TenantActor, input: EnterpriseEventInput<TDetail>, eb?: EventBridgeClient, retry: RetryOptions = {}): Promise<string | undefined> {
  assertTenantAccess(actor, input.tenantId);
  const event = enterpriseEvent(input);
  return retryWithBackoff(() => publishEvent(event.eventBusName, event.source, event.detailType, event.detail, eb), retry);
}

/**
 * Splits large event arrays into EventBridge PutEvents batches of 10 entries.
 * Example: nightly invoice job publishes 25 invoice events as 3 safe PutEvents requests.
 */
export async function publishEventsInBatches(events: AppEvent<unknown>[], eb?: EventBridgeClient, batchSize = MAX_PUT_EVENTS_BATCH_SIZE): Promise<(string | undefined)[]> {
  if (batchSize < 1 || batchSize > MAX_PUT_EVENTS_BATCH_SIZE) throw new Error("batchSize must be between 1 and 10");
  const ids: (string | undefined)[] = [];
  for (let index = 0; index < events.length; index += batchSize) ids.push(...(await publishEvents(events.slice(index, index + batchSize), eb)));
  return ids;
}

/**
 * Creates target config with retry and DLQ settings for durable event delivery.
 * Example: rule sends to SQS with 24-hour max age, 3 retry attempts, and a DLQ for poison events.
 */
export async function putDurableTarget(rule: string, eventBusName: string, targetArn: string, dlqArn: string, id = "target", eb?: EventBridgeClient): Promise<void> {
  await putTarget(rule, eventBusName, targetArn, id, eb, { deadLetterArn: dlqArn, maxRetryAttempts: 3, maxEventAgeSeconds: 86_400 });
}

/**
 * Creates EventBridge pattern that filters source, type, and tenant inside event detail.
 * Example: tenant-specific billing processor receives only tenant-a `invoice.created` events.
 */
export function tenantEventPattern(source: string, detailType: string, tenantId: string): Record<string, unknown> {
  return { source: [source], "detail-type": [detailType], detail: { tenantId: [tenantId] } };
}

/**
 * Plans archive and replay retention for operational recovery and compliance.
 * Example: keep order events 90 days so failed downstream projections can replay from incident window.
 */
export function archiveLifecyclePlan(eventBusName: string, archiveName: string, retentionDays = 90, replayWindowDays = 7, reason = "operational replay and audit recovery"): ArchiveLifecyclePlan {
  return { eventBusName, archiveName, retentionDays, replayWindowDays, reason };
}

/**
 * Defines metrics, alarms, and log fields for EventBridge observability.
 * Example: dashboard watches failed invocations, throttles, DLQ depth, latency, and cost signal.
 */
export function eventBridgeObservabilityPlan(service: string): EventBridgeObservabilityPlan {
  return {
    service,
    metrics: ["PutEvents.Success", "PutEvents.FailedEntryCount", "Invocations", "FailedInvocations", "ThrottledRules", "DLQDepth"],
    alarms: [`${service}-failed-invocations`, `${service}-throttled-rules`, `${service}-dlq-depth`, `${service}-putevents-failed-entry-count`],
    logFields: ["tenantId", "eventId", "correlationId", "source", "detailType", "requestId", "outcome"],
  };
}

/**
 * Estimates PutEvents request count and cost for capacity planning.
 * Example: 2.5M events/month at 10 events/request estimates request volume and rough publish cost.
 */
export function estimatePutEventsCost(eventCount: number, pricePerMillionEventsUsd = 1): EventBridgeCostEstimate {
  return {
    eventCount,
    putEventsRequests: Math.ceil(eventCount / MAX_PUT_EVENTS_BATCH_SIZE),
    estimatedPutEventsCostUsd: (eventCount / 1_000_000) * pricePerMillionEventsUsd,
  };
}
