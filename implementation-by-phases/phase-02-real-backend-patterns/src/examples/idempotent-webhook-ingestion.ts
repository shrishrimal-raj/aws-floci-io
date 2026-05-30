import { createTokenBucket, consumeToken, retryAfterSeconds } from "../rate-limit.js";
import { assertEndpointAccess, webhookAuditEvent } from "../enterprise-patterns.js";
import type { WebhookDelivery } from "../webhook.js";

/**
 * Real-world ingestion pattern: tenant authorization + rate limit + audit event before enqueueing durable work.
 */
export function idempotentWebhookIngestionExample(delivery: WebhookDelivery, eventType = "invoice.paid") {
  assertEndpointAccess(
    { tenantId: delivery.tenantId, endpointId: delivery.endpointId, enabled: true, allowedEventTypes: ["invoice.paid"] },
    delivery,
    eventType
  );

  const bucket = createTokenBucket(2, 1, 0);
  const first = consumeToken(bucket, 0);
  const second = consumeToken(first.state, 0);
  const third = consumeToken(second.state, 0);

  return {
    accepted: first.allowed && second.allowed,
    thirdRequestAllowed: third.allowed,
    retryAfterSeconds: retryAfterSeconds(third.state),
    audit: webhookAuditEvent(delivery, "Webhook.Accept", "accepted", { eventType }),
  };
}
