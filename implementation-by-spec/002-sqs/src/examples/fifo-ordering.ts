#!/usr/bin/env tsx
import {
  createQueue,
  deleteMessage,
  deleteQueue,
  receiveMessages,
  sendFifoMessage,
} from "../use-cases/queues.js";

const queueUrl = await createQueue({
  name: `floci-sqs-fifo-${Date.now()}.fifo`,
  fifo: true,
});

await sendFifoMessage(queueUrl, "customer-1", "order-1-created", {
  orderId: "order-1",
  status: "created",
});

const [message] = await receiveMessages(queueUrl, 1, 1);
console.log(message?.body);

if (message?.receiptHandle) {
  await deleteMessage(queueUrl, message.receiptHandle);
}

await deleteQueue(queueUrl);
