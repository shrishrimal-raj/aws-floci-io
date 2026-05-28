#!/usr/bin/env tsx
import { CreateQueueCommand, GetQueueAttributesCommand, SQSClient } from "@aws-sdk/client-sqs";
import { awsDefaults } from "@floci-lab/aws-clients";
import { createTopic, subscribe } from "../src/use-cases/topics.js";

export const topicName = process.env.SNS_TOPIC_NAME ?? "floci-sns-lab";
export const fifoTopicName = process.env.SNS_FIFO_TOPIC_NAME ?? "floci-sns-lab.fifo";
export const sinkQueueName = process.env.SNS_SINK_QUEUE_NAME ?? "floci-sns-lab-sink";

const sqs = new SQSClient(awsDefaults({ endpoint: process.env.AWS_ENDPOINT_URL ?? "http://localhost:4566" }));
const createdQueue = await sqs.send(new CreateQueueCommand({ QueueName: sinkQueueName }));
const attrs = await sqs.send(
  new GetQueueAttributesCommand({ QueueUrl: createdQueue.QueueUrl, AttributeNames: ["QueueArn"] })
);
const queueArn = attrs.Attributes?.QueueArn;
if (!queueArn) throw new Error("Sink queue ARN missing");

const topicArn = await createTopic({ name: topicName, displayName: "Floci SNS Lab" });
const fifoTopicArn = await createTopic({ name: fifoTopicName, fifo: true });

const subscriptionArn = await subscribe({
  topicArn,
  protocol: "sqs",
  endpoint: queueArn,
  filterPolicy: { eventType: ["lab.created"] },
  rawMessageDelivery: true,
});

console.log(`Setup SNS topic ${topicArn}`);
console.log(`Setup SNS FIFO topic ${fifoTopicArn}`);
console.log(`Setup SNS sink queue ${createdQueue.QueueUrl}`);
console.log(`Setup SNS subscription ${subscriptionArn}`);
