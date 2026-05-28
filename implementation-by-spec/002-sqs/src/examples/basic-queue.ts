#!/usr/bin/env tsx
import {
  createQueueWithDlq,
  deleteMessage,
  deleteQueue,
  receiveMessages,
  sendMessage,
} from "../use-cases/queues.js";

const name = `floci-sqs-example-${Date.now()}`;
const { queueUrl, deadLetterQueueUrl } = await createQueueWithDlq(name);

await sendMessage({ queueUrl, body: JSON.stringify({ type: "email.send", userId: "u1" }) });

const [message] = await receiveMessages(queueUrl, 1, 1);
console.log(message?.body);

if (message?.receiptHandle) {
  await deleteMessage(queueUrl, message.receiptHandle);
}

await deleteQueue(queueUrl);
await deleteQueue(deadLetterQueueUrl);
