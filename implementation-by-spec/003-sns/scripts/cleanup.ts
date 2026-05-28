#!/usr/bin/env tsx
import { DeleteQueueCommand, GetQueueUrlCommand, SQSClient } from "@aws-sdk/client-sqs";
import { awsDefaults } from "@floci-lab/aws-clients";
import { createTopic, deleteTopic, listSubscriptions, unsubscribe } from "../src/use-cases/topics.js";

const topicName = process.env.SNS_TOPIC_NAME ?? "floci-sns-lab";
const fifoTopicName = process.env.SNS_FIFO_TOPIC_NAME ?? "floci-sns-lab.fifo";
const sinkQueueName = process.env.SNS_SINK_QUEUE_NAME ?? "floci-sns-lab-sink";

for (const topicArn of [
  await createTopic({ name: topicName }),
  await createTopic({ name: fifoTopicName, fifo: true }),
]) {
  for (const subscription of await listSubscriptions(topicArn)) {
    await unsubscribe(subscription.SubscriptionArn);
  }
  await deleteTopic(topicArn);
}

const sqs = new SQSClient(awsDefaults({ endpoint: process.env.AWS_ENDPOINT_URL ?? "http://localhost:4566" }));
try {
  const queue = await sqs.send(new GetQueueUrlCommand({ QueueName: sinkQueueName }));
  if (queue.QueueUrl) await sqs.send(new DeleteQueueCommand({ QueueUrl: queue.QueueUrl }));
} catch {
  // already deleted
}

console.log("Cleanup SNS topics");
