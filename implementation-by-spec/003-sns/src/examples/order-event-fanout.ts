#!/usr/bin/env tsx
import {
  createTopic,
  createTopicAuditEvent,
  deleteTopic,
  listSubscriptions,
  publishJsonEvent,
  setSubscriptionFilterPolicy,
  subscribeSqsWithFilter,
  summarizeSubscriptions,
  unsubscribe,
} from "../use-cases/topics.js";

const topicArn = await createTopic({
  name: `floci-sns-orders-${Date.now()}`,
  displayName: "orders",
});

const billingSubscriptionArn = await subscribeSqsWithFilter(
  topicArn,
  "arn:aws:sqs:us-east-1:000000000000:billing-worker",
  { eventType: ["order.created", "order.refunded"], tenantId: ["acme-retail"] },
);

await setSubscriptionFilterPolicy(billingSubscriptionArn, {
  eventType: ["order.created", "order.refunded", "invoice.requested"],
  tenantId: ["acme-retail"],
});

const messageId = await publishJsonEvent(
  topicArn,
  "order.created",
  { tenantId: "acme-retail", orderId: "ord-1001", totalCents: 12999 },
  "trace-order-1001",
);

console.log({
  pattern:
    "SNS fanout routes one domain event to billing, fulfillment, email, and analytics queues",
  audit: createTopicAuditEvent({
    topicArn,
    messageId,
    action: "OrderEventPublished",
    outcome: "PUBLISHED",
    eventType: "order.created",
    traceId: "trace-order-1001",
    tenantId: "acme-retail",
  }),
  subscriptions: summarizeSubscriptions(await listSubscriptions(topicArn)),
});

await unsubscribe(billingSubscriptionArn);
await deleteTopic(topicArn);
