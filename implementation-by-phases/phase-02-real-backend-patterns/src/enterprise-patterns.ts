import type { DeliveryResult, WebhookDelivery } from "./webhook.js";

export type AuditOutcome = "accepted" | "delivered" | "retry" | "dlq" | "failed" | "denied";

export interface WebhookAuditEvent {
  tenantId: string;
  endpointId: string;
  eventId: string;
  action: string;
  outcome: AuditOutcome;
  occurredAt: string;
  requestId?: string;
  details?: Record<string, unknown>;
}

export interface EndpointAccessPolicy {
  tenantId: string;
  endpointId: string;
  enabled: boolean;
  allowedEventTypes: string[];
}

export interface RetentionPolicy {
  hotDays: number;
  archiveDays: number;
}

/**
 * Enforces tenant endpoint ownership and event allow-list before delivery.
 *
 * Example: reject `invoice.paid` delivery to disabled endpoint or endpoint owned by another tenant.
 */
export function assertEndpointAccess(policy: EndpointAccessPolicy, delivery: WebhookDelivery, eventType: string): void {
  if (!policy.enabled) throw new Error(`Endpoint disabled: ${policy.endpointId}`);
  if (policy.tenantId !== delivery.tenantId || policy.endpointId !== delivery.endpointId) throw new Error("Endpoint tenant mismatch");
  if (!policy.allowedEventTypes.includes(eventType)) throw new Error(`Event type not allowed: ${eventType}`);
}

/**
 * Builds audit event for webhook lifecycle changes.
 *
 * Example: write accepted, retry, delivered, and DLQ transitions to CloudWatch Logs or SIEM export.
 */
export function webhookAuditEvent(
  delivery: Pick<WebhookDelivery, "tenantId" | "endpointId" | "eventId">,
  action: string,
  outcome: AuditOutcome,
  details?: Record<string, unknown>,
  now = new Date()
): WebhookAuditEvent {
  return {
    tenantId: delivery.tenantId,
    endpointId: delivery.endpointId,
    eventId: delivery.eventId,
    action,
    outcome,
    details,
    occurredAt: now.toISOString(),
  };
}

/**
 * Removes secrets and full payloads before logs or email notifications.
 *
 * Example: log endpoint ID and event ID, never webhook secret or PII-heavy payload body.
 */
export function redactWebhookDelivery(delivery: WebhookDelivery): Record<string, unknown> {
  return {
    tenantId: delivery.tenantId,
    endpointId: delivery.endpointId,
    eventId: delivery.eventId,
    url: delivery.url,
    attempt: delivery.attempt,
    secret: "[REDACTED]",
    payload: "[REDACTED]",
  };
}

/**
 * Converts delivery result to metrics dimensions safe for CloudWatch dashboards.
 *
 * Example: increment `WebhookDeliveryCount` with returned dimensions for SLO and cost dashboards.
 */
export function deliveryMetricDimensions(delivery: WebhookDelivery, result: DeliveryResult): Record<string, string> {
  return {
    TenantId: delivery.tenantId,
    EndpointId: delivery.endpointId,
    Result: result.status,
    StatusCode: String(result.statusCode ?? "network"),
  };
}

/**
 * Plans hot retention vs archive/delete for webhook audit history.
 *
 * Example: keep 30 days searchable in DynamoDB, archive older records to S3, delete beyond compliance window.
 */
export function webhookRetentionDecision(
  occurredAt: string,
  policy: RetentionPolicy,
  now = new Date()
): "hot" | "archive" | "delete" {
  const ageDays = Math.floor((now.getTime() - new Date(occurredAt).getTime()) / 86_400_000);
  if (ageDays >= policy.archiveDays) return "delete";
  if (ageDays >= policy.hotDays) return "archive";
  return "hot";
}
