#!/usr/bin/env tsx
import {
  addTopicPermission,
  buildComplianceTopicAttributes,
  createTopic,
  createTopicAuditEvent,
  deleteTopic,
  getTopicAttributes,
  listTopicTags,
  publishJsonEvent,
  removeTopicPermission,
  setTopicAttributes,
  tagTopic,
  untagTopic,
} from "../use-cases/topics.js";

const topicArn = await createTopic({
  name: `floci-sns-compliance-kms-${Date.now()}`,
  displayName: "pii-events",
});

await setTopicAttributes(
  topicArn,
  buildComplianceTopicAttributes("alias/pii-events-key", {
    displayName: "pii-events",
    enforceSslOnlyPolicy: true,
  }),
);

await tagTopic(topicArn, {
  Environment: "prod",
  TenantId: "regulated-co",
  CostCenter: "security",
  DataClassification: "PII",
  Owner: "compliance-team",
});

await addTopicPermission(
  topicArn,
  "cross-account-auditor",
  ["123456789012"],
  ["Publish", "Subscribe"],
);

const messageId = await publishJsonEvent(
  topicArn,
  "access.review.completed",
  {
    tenantId: "regulated-co",
    controlId: "AC-2",
    result: "pass",
    reviewer: "secops-bot",
  },
  "trace-ac2-001",
);

console.log({
  messageId,
  attributes: await getTopicAttributes(topicArn),
  tags: await listTopicTags(topicArn),
  audit: createTopicAuditEvent({
    topicArn,
    messageId,
    action: "ComplianceReviewPublished",
    outcome: "PUBLISHED",
    eventType: "access.review.completed",
    tenantId: "regulated-co",
    traceId: "trace-ac2-001",
  }),
});

await removeTopicPermission(topicArn, "cross-account-auditor");
await untagTopic(topicArn, ["Owner"]);
await deleteTopic(topicArn);
