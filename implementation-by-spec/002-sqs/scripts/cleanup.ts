#!/usr/bin/env tsx
import { deleteQueue, getQueueUrl } from "../src/use-cases/queues.js";

const standardQueueName = process.env.SQS_QUEUE_NAME ?? "floci-sqs-lab";
const fifoQueueName = process.env.SQS_FIFO_QUEUE_NAME ?? "floci-sqs-lab.fifo";

await deleteQueue(await getQueueUrl(standardQueueName));
await deleteQueue(await getQueueUrl(`${standardQueueName}-dlq`));
await deleteQueue(await getQueueUrl(fifoQueueName));

console.log("Cleanup SQS queues");
