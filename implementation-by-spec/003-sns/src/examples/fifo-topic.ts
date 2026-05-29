#!/usr/bin/env tsx
import {
  createTopic,
  deleteTopic,
  publishFifoJsonEvent,
} from "../use-cases/topics.js";

const topicArn = await createTopic({
  name: `floci-sns-fifo-${Date.now()}.fifo`,
  fifo: true,
});

const messageId = await publishFifoJsonEvent(
  topicArn,
  "customer-1",
  "event-1",
  "order.created",
  { orderId: "o1" },
);
console.log({ topicArn, messageId });

await deleteTopic(topicArn);
