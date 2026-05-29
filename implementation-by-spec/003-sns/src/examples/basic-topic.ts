#!/usr/bin/env tsx
import {
  createTopic,
  deleteTopic,
  publishMessage,
  subscribe,
  unsubscribe,
} from "../use-cases/topics.js";

const topicArn = await createTopic({ name: `floci-sns-example-${Date.now()}` });
const subscriptionArn = await subscribe({
  topicArn,
  protocol: "sqs",
  endpoint: "arn:aws:sqs:us-east-1:000000000000:example-sink",
  filterPolicy: { eventType: ["order.created"] },
  rawMessageDelivery: true,
});

const messageId = await publishMessage({
  topicArn,
  subject: "Order created",
  message: JSON.stringify({ orderId: "o1" }),
  attributes: {
    eventType: { DataType: "String", StringValue: "order.created" },
  },
});

console.log({ topicArn, subscriptionArn, messageId });

await unsubscribe(subscriptionArn);
await deleteTopic(topicArn);
