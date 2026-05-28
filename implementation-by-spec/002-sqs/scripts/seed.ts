#!/usr/bin/env tsx
import { standardQueueName } from "./setup.js";
import { getQueueUrl, sendMessage, sendMessageBatch } from "../src/use-cases/queues.js";

const queueUrl = await getQueueUrl(standardQueueName);
if (!queueUrl) throw new Error(`Queue ${standardQueueName} not found. Run pnpm setup first.`);

await sendMessage({ queueUrl, body: JSON.stringify({ type: "fixture.created", id: "seed-1" }) });
await sendMessageBatch(queueUrl, ["batch-1", "batch-2"]);

console.log(`Seed SQS queue ${queueUrl}`);
