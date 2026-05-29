#!/usr/bin/env tsx
import {
  createTopic,
  deleteTopic,
  publishMessageWithRetry,
  subscribe,
  topicMessageAttributes,
  unsubscribe,
} from "../use-cases/topics.js";

const topicArn = await createTopic({
  name: `floci-sns-tenant-alerts-${Date.now()}`,
  displayName: "tenant-alerts",
});

const subscriptionArn = await subscribe({
  topicArn,
  protocol: "https",
  endpoint: "https://alerts.example.com/webhooks/tenant-events",
  filterPolicy: { tenantId: ["acme-health"], severity: ["critical", "high"] },
  rawMessageDelivery: false,
});

const messageId = await publishMessageWithRetry(
  {
    topicArn,
    subject: "High severity tenant alert",
    message: JSON.stringify({
      tenantId: "acme-health",
      alertId: "alert-9001",
      summary: "Claims export failed",
    }),
    attributes: topicMessageAttributes({
      eventType: "tenant.alert.created",
      tenantId: "acme-health",
      severity: "high",
      traceId: "trace-alert-9001",
    }),
  },
  { attempts: 3, baseDelayMs: 50 },
);

console.log({
  messageId,
  secureAccessPattern:
    "publishers need sns:Publish on topic ARN; subscribers receive only filter-matched tenant events",
  productionControls: [
    "HTTPS signature validation",
    "KMS topic encryption",
    "delivery failure alarm",
    "least privilege IAM",
  ],
});

await unsubscribe(subscriptionArn);
await deleteTopic(topicArn);
