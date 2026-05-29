#!/usr/bin/env tsx
import { createTopic, deleteTopic, publishJsonEvent } from "../use-cases/topics.js";

const topicArn = await createTopic({ name: `floci-sns-json-${Date.now()}` });

const messageId = await publishJsonEvent(topicArn, "user.created", { userId: "u1" }, "trace-example");
console.log({ topicArn, messageId });

await deleteTopic(topicArn);
