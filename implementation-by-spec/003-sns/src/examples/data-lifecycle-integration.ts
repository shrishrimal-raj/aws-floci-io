#!/usr/bin/env tsx
import {
  createTopic,
  deleteTopic,
  publishJsonEvent,
  subscribeSqsWithFilter,
  unsubscribe,
} from "../use-cases/topics.js";

const topicArn = await createTopic({
  name: `floci-sns-lifecycle-${Date.now()}`,
});

const archiveSubscriptionArn = await subscribeSqsWithFilter(
  topicArn,
  "arn:aws:sqs:us-east-1:000000000000:data-lifecycle-worker",
  {
    eventType: ["object.archive.requested", "object.delete.requested"],
    dataClass: ["temporary", "archive"],
  },
);

const messageId = await publishJsonEvent(
  topicArn,
  "object.archive.requested",
  {
    tenantId: "acme-media",
    bucket: "media-assets",
    key: "tenants/acme-media/raw/video-001.mp4",
    retentionDays: 2555,
  },
  "trace-lifecycle-001",
);

console.log({
  messageId,
  integration:
    "SNS notifies SQS/Lambda workers to transition or delete S3 objects after business approval",
  validUse:
    "SNS carries lifecycle command; durable lifecycle state remains in S3/DynamoDB/AWS Backup",
});

await unsubscribe(archiveSubscriptionArn);
await deleteTopic(topicArn);
