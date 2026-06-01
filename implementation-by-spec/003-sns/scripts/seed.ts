#!/usr/bin/env tsx
import { complianceTopicName, drTopicName, topicName } from "./setup.js";
import { createTopic, publishJsonEvent, publishMessage, topicMessageAttributes } from "../src/use-cases/topics.js";

const topicArn = await createTopic({ name: topicName, displayName: "Floci SNS Lab" });

await publishMessage({
  topicArn,
  subject: "Fixture event",
  message: JSON.stringify({ eventType: "lab.created", id: "seed-1" }),
  attributes: { eventType: { DataType: "String", StringValue: "lab.created" } },
});

const complianceTopicArn = await createTopic({
  name: complianceTopicName,
  displayName: "Compliance Events",
});

await publishJsonEvent(
  complianceTopicArn,
  "policy.violation.detected",
  {
    tenantId: "regulated-co",
    policyId: "required-tags",
    resourceId: "bucket-1",
    severity: "high",
  },
  "trace-compliance-001",
);

const drTopicArn = await createTopic({
  name: drTopicName,
  displayName: "DR Drill Events",
});

await publishMessage({
  topicArn: drTopicArn,
  subject: "DR drill fixture",
  message: JSON.stringify({ eventType: "dr.drill.started", id: "dr-seed-1" }),
  attributes: topicMessageAttributes({
    eventType: "dr.drill.started",
    tenantId: "platform",
    severity: "high",
  }),
});

console.log(`Seed SNS topic ${topicArn}`);
console.log(`Seed SNS compliance topic ${complianceTopicArn}`);
console.log(`Seed SNS DR topic ${drTopicArn}`);
