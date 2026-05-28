import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { CreateQueueCommand, DeleteQueueCommand, GetQueueAttributesCommand, SQSClient } from "@aws-sdk/client-sqs";
import { awsDefaults } from "@floci-lab/aws-clients";
import { client } from "../src/client.js";
import {
  createTopic,
  deleteTopic,
  listSubscriptions,
  publishMessage,
  setSubscriptionFilterPolicy,
  subscribe,
  unsubscribe,
} from "../src/use-cases/topics.js";
import { waitForFloci } from "@floci-lab/test-utils";

const suffix = Date.now();
const sqs = new SQSClient(awsDefaults({ endpoint: process.env.AWS_ENDPOINT_URL ?? "http://localhost:4566" }));
let topicArn: string;
let fifoTopicArn: string;
let subscriptionArn: string | undefined;
let queueUrl: string | undefined;
let queueArn: string;

describe("SNS", () => {
  beforeAll(async () => {
    await waitForFloci();
    topicArn = await createTopic({ name: `floci-sns-test-${suffix}` });
    fifoTopicArn = await createTopic({ name: `floci-sns-test-${suffix}.fifo`, fifo: true });

    const created = await sqs.send(new CreateQueueCommand({ QueueName: `floci-sns-test-${suffix}-sink` }));
    queueUrl = created.QueueUrl;
    const attrs = await sqs.send(
      new GetQueueAttributesCommand({ QueueUrl: queueUrl, AttributeNames: ["QueueArn"] })
    );
    queueArn = attrs.Attributes?.QueueArn ?? "";
  });

  afterAll(async () => {
    await unsubscribe(subscriptionArn);
    await deleteTopic(topicArn);
    await deleteTopic(fifoTopicArn);
    if (queueUrl) await sqs.send(new DeleteQueueCommand({ QueueUrl: queueUrl }));
  });

  it("client is configured against Floci", () => {
    expect(client).toBeDefined();
  });

  it("subscribes SQS endpoints with filter policies", async () => {
    subscriptionArn = await subscribe({
      topicArn,
      protocol: "sqs",
      endpoint: queueArn,
      filterPolicy: { eventType: ["user.created"] },
      rawMessageDelivery: true,
    });

    expect(subscriptionArn).toContain(":");

    await setSubscriptionFilterPolicy(subscriptionArn, { eventType: ["user.created", "user.updated"] });

    const subscriptions = await listSubscriptions(topicArn);
    expect(subscriptions.some((subscription) => subscription.SubscriptionArn === subscriptionArn)).toBe(true);
  });

  it("publishes standard and FIFO messages", async () => {
    await expect(
      publishMessage({
        topicArn,
        subject: "User created",
        message: JSON.stringify({ id: "u1" }),
        attributes: { eventType: { DataType: "String", StringValue: "user.created" } },
      })
    ).resolves.toBeTruthy();

    await expect(
      publishMessage({
        topicArn: fifoTopicArn,
        message: JSON.stringify({ id: "u2" }),
        groupId: "users",
      })
    ).resolves.toBeTruthy();
  });
});
