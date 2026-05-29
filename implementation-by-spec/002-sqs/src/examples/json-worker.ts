#!/usr/bin/env tsx
import {
  createQueueWithDlq,
  deleteQueue,
  processOneMessage,
  sendJsonMessage,
} from "../use-cases/queues.js";

const name = `floci-sqs-json-${Date.now()}`;
const { queueUrl, deadLetterQueueUrl } = await createQueueWithDlq(name);

await sendJsonMessage(
  queueUrl,
  "order.created",
  { orderId: "o1", totalCents: 4200 },
  "trace-example",
);

await processOneMessage(queueUrl, async (message) => {
  console.log(message.body);
});

await deleteQueue(queueUrl);
await deleteQueue(deadLetterQueueUrl);
