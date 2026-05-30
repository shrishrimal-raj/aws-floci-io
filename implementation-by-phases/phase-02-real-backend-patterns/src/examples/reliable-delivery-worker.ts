import { webhookFailureEmail } from "../email.js";
import { deliveryMetricDimensions, redactWebhookDelivery, webhookAuditEvent } from "../enterprise-patterns.js";
import { deliverWebhook, type WebhookDelivery } from "../webhook.js";

/**
 * Real-world worker pattern: signed delivery + retry/DLQ classification + metrics + tenant notification payload.
 */
export async function reliableDeliveryWorkerExample(delivery: WebhookDelivery, status = 503) {
  const result = await deliverWebhook(delivery, async () => new Response("simulated", { status }));

  return {
    result,
    audit: webhookAuditEvent(delivery, "Webhook.Deliver", result.status, {
      statusCode: result.statusCode,
      nextDelayMs: result.nextDelayMs,
      delivery: redactWebhookDelivery(delivery),
    }),
    metricDimensions: deliveryMetricDimensions(delivery, result),
    alertEmail:
      result.status === "dlq" || result.status === "failed"
        ? webhookFailureEmail({
            from: "alerts@example.com",
            to: "admin@example.com",
            tenantId: delivery.tenantId,
            endpointId: delivery.endpointId,
            eventId: delivery.eventId,
            statusCode: result.statusCode,
          })
        : undefined,
  };
}
