#!/usr/bin/env tsx
import { createQueue, createQueueWithDlq } from "../src/use-cases/queues.js";

export const standardQueueName = process.env.SQS_QUEUE_NAME ?? "floci-sqs-lab";
export const fifoQueueName = process.env.SQS_FIFO_QUEUE_NAME ?? "floci-sqs-lab.fifo";

const pair = await createQueueWithDlq(standardQueueName, 3);
const fifoQueueUrl = await createQueue({ name: fifoQueueName, fifo: true, visibilityTimeoutSeconds: 5 });

console.log(`Setup SQS queue ${pair.queueUrl}`);
console.log(`Setup SQS DLQ ${pair.deadLetterQueueUrl}`);
console.log(`Setup SQS FIFO queue ${fifoQueueUrl}`);
