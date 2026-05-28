#!/usr/bin/env tsx
import { topicName } from "./setup.js";
import { createTopic, publishMessage } from "../src/use-cases/topics.js";

const topicArn = await createTopic({ name: topicName, displayName: "Floci SNS Lab" });

await publishMessage({
  topicArn,
  subject: "Fixture event",
  message: JSON.stringify({ eventType: "lab.created", id: "seed-1" }),
  attributes: { eventType: { DataType: "String", StringValue: "lab.created" } },
});

console.log(`Seed SNS topic ${topicArn}`);
