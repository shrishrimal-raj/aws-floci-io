#!/usr/bin/env tsx
import {
  createTopic,
  createTopicAuditEvent,
  deleteTopic,
  publishMessageWithRetry,
  subscribeSqsWithFilter,
  topicMessageAttributes,
  unsubscribe,
} from "../use-cases/topics.js";

const topicArn = await createTopic({ name: `floci-sns-dr-${Date.now()}` });

const primarySubscriptionArn = await subscribeSqsWithFilter(
  topicArn,
  "arn:aws:sqs:us-east-1:000000000000:primary-processing-queue",
  { eventType: ["payment.settlement.requested"] },
);

const drSubscriptionArn = await subscribeSqsWithFilter(
  topicArn,
  "arn:aws:sqs:us-east-1:000000000000:dr-fallback-queue",
  { eventType: ["payment.settlement.requested"] },
);

const messageId = await publishMessageWithRetry(
  {
    topicArn,
    subject: "Settlement retry drill",
    message: JSON.stringify({
      tenantId: "acme-finance",
      settlementId: "set-001",
      amountCents: 122500,
      drMode: true,
    }),
    attributes: topicMessageAttributes({
      eventType: "payment.settlement.requested",
      tenantId: "acme-finance",
      severity: "high",
      traceId: "trace-drill-001",
    }),
  },
  { attempts: 4, baseDelayMs: 50 },
);

console.log({
  drill: "backup/disaster recovery fanout drill",
  messageId,
  runbook: [
    "if primary consumer fails, DR queue consumer continues processing",
    "replay from DR queue after regional recovery",
    "compare settlement IDs against ledger to avoid duplicates",
  ],
  audit: createTopicAuditEvent({
    topicArn,
    messageId,
    action: "SettlementDrillPublished",
    outcome: "PUBLISHED",
    eventType: "payment.settlement.requested",
    tenantId: "acme-finance",
    traceId: "trace-drill-001",
  }),
});

await unsubscribe(primarySubscriptionArn);
await unsubscribe(drSubscriptionArn);
await deleteTopic(topicArn);
