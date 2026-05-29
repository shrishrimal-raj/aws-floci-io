#!/usr/bin/env tsx
import {
  createTopic,
  createTopicAuditEvent,
  deleteTopic,
  estimateSnsPublishCost,
  listSubscriptions,
  publishMessage,
  subscribe,
  summarizeSubscriptions,
  topicMessageAttributes,
  unsubscribe,
} from "../use-cases/topics.js";

const topicArn = await createTopic({
  name: `floci-sns-compliance-${Date.now()}`,
  displayName: "compliance-events",
});
const subscriptionArn = await subscribe({
  topicArn,
  protocol: "email",
  endpoint: "compliance@example.com",
  filterPolicy: { eventType: ["policy.violation.detected"] },
});

const messageId = await publishMessage({
  topicArn,
  subject: "Policy violation detected",
  message: JSON.stringify({
    tenantId: "regulated-co",
    ruleId: "required-tags",
    resourceId: "bucket-1",
  }),
  attributes: topicMessageAttributes({
    eventType: "policy.violation.detected",
    tenantId: "regulated-co",
  }),
});

console.log({
  audit: createTopicAuditEvent({
    topicArn,
    messageId,
    action: "ComplianceEventPublished",
    outcome: "PUBLISHED",
    eventType: "policy.violation.detected",
    tenantId: "regulated-co",
  }),
  subscriptions: summarizeSubscriptions(await listSubscriptions(topicArn)),
  monthlyCostEstimate: estimateSnsPublishCost({ publishes: 20_000_000 }),
  monitoring: [
    "NumberOfMessagesPublished",
    "NumberOfNotificationsFailed",
    "delivery latency",
    "SMS spend if used",
  ],
});

await unsubscribe(subscriptionArn);
await deleteTopic(topicArn);
