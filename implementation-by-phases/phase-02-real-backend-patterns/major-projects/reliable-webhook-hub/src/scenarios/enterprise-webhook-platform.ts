import { fileURLToPath } from "node:url";
import { complianceLifecycleExample } from "../../../../src/examples/compliance-lifecycle.js";
import { idempotentWebhookIngestionExample } from "../../../../src/examples/idempotent-webhook-ingestion.js";
import { reliableDeliveryWorkerExample } from "../../../../src/examples/reliable-delivery-worker.js";
import type { WebhookDelivery } from "../../../../src/webhook.js";

/**
 * End-to-end enterprise scenario:
 * 1. authorize tenant endpoint and apply rate limit
 * 2. sign and deliver webhook with retry classification
 * 3. create audit/metrics/alert payloads
 * 4. classify audit records for lifecycle retention
 */
export async function enterpriseWebhookPlatformScenario() {
  const delivery: WebhookDelivery = {
    tenantId: "tenant-enterprise",
    endpointId: "billing-prod",
    url: "https://partner.example.com/webhooks/billing",
    secret: "demo-secret",
    eventId: "evt_invoice_paid_001",
    payload: { type: "invoice.paid", invoiceId: "inv-001", amountCents: 49900 },
    attempt: 2,
  };

  const ingestion = idempotentWebhookIngestionExample(delivery);
  const worker = await reliableDeliveryWorkerExample(delivery, 503);
  const lifecycle = complianceLifecycleExample();

  return { ingestion, worker, lifecycle };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  console.log(JSON.stringify(await enterpriseWebhookPlatformScenario(), null, 2));
}
