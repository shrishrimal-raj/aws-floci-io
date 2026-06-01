#!/usr/bin/env tsx
import {
  createTopic,
  deleteTopic,
  estimateSnsFanoutCost,
  estimateSnsPublishCost,
  publishMessage,
  subscribeSqsWithFilter,
  topicMessageAttributes,
  unsubscribe,
} from "../use-cases/topics.js";

const topicArn = await createTopic({
  name: `floci-sns-cost-fanout-${Date.now()}`,
  displayName: "cost-optimization-events",
});

const analyticsSub = await subscribeSqsWithFilter(
  topicArn,
  "arn:aws:sqs:us-east-1:000000000000:analytics-worker",
  { eventType: ["order.created", "order.refunded"], tenantId: ["acme"] },
);

const billingSub = await subscribeSqsWithFilter(
  topicArn,
  "arn:aws:sqs:us-east-1:000000000000:billing-worker",
  { eventType: ["order.created"] },
);

const emailSub = await subscribeSqsWithFilter(
  topicArn,
  "arn:aws:sqs:us-east-1:000000000000:email-worker",
  { eventType: ["order.created"] },
);

await publishMessage({
  topicArn,
  subject: "Order created",
  message: JSON.stringify({ orderId: "ord-1001", tenantId: "acme" }),
  attributes: topicMessageAttributes({
    eventType: "order.created",
    tenantId: "acme",
    traceId: "trace-cost-001",
  }),
});

const publishOnly = estimateSnsPublishCost({ publishes: 20_000_000 });
const filteredFanout = estimateSnsFanoutCost({
  publishes: 20_000_000,
  averageDeliveriesPerPublish: 2.1,
});
const unfilteredFanout = estimateSnsFanoutCost({
  publishes: 20_000_000,
  averageDeliveriesPerPublish: 8,
});

console.log({
  pattern: "cost optimization by tightening filter policies and avoiding unnecessary deliveries",
  publishOnly,
  filteredFanout,
  unfilteredFanout,
  estimatedSavingsUsd:
    Number((unfilteredFanout.requestUsd - filteredFanout.requestUsd).toFixed(2)),
});

await unsubscribe(analyticsSub);
await unsubscribe(billingSub);
await unsubscribe(emailSub);
await deleteTopic(topicArn);
