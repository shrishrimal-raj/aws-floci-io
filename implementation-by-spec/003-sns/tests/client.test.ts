import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { CreateQueueCommand, DeleteQueueCommand, GetQueueAttributesCommand, SQSClient } from "@aws-sdk/client-sqs";
import type { SNSClient } from "@aws-sdk/client-sns";
import { awsDefaults } from "@floci-lab/aws-clients";
import { client } from "../src/client.js";
import type { SNSError } from "../src/errors.js";
import {
  createTopic,
  deleteTopic,
  listSubscriptions,
  publishFifoJsonEvent,
  publishJsonEvent,
  publishMessage,
  setSubscriptionFilterPolicy,
  subscribeSqsWithFilter,
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

function failingClient(name: string): SNSClient {
  return {
    send: vi.fn(async () => {
      const error = new Error(`${name} failed`);
      error.name = name;
      throw error;
    }),
  } as unknown as SNSClient;
}

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
    subscriptionArn = await subscribeSqsWithFilter(topicArn, queueArn, { eventType: ["user.created"] });

    expect(subscriptionArn).toContain(":");

    await setSubscriptionFilterPolicy(subscriptionArn, { eventType: ["user.created", "user.updated"] });

    const subscriptions = await listSubscriptions(topicArn);
    expect(subscriptions.some((subscription) => subscription.SubscriptionArn === subscriptionArn)).toBe(true);
  });

  it("publishes raw, JSON, and FIFO messages", async () => {
    await expect(
      publishMessage({
        topicArn,
        subject: "User created",
        message: JSON.stringify({ id: "u1" }),
        attributes: { eventType: { DataType: "String", StringValue: "user.created" } },
      })
    ).resolves.toBeTruthy();

    await expect(publishJsonEvent(topicArn, "user.updated", { id: "u2" }, "trace-1")).resolves.toBeTruthy();

    await expect(
      publishFifoJsonEvent(fifoTopicArn, "users", `dedupe-${Date.now()}`, "user.created", { id: "u3" })
    ).resolves.toBeTruthy();
  });

  it("wraps SDK create failures in SNSError", async () => {
    await expect(createTopic({ name: "x" }, failingClient("AuthorizationError"))).rejects.toMatchObject({
      code: "SNS_AuthorizationError",
      message: "SNS createTopic failed",
    } satisfies Partial<SNSError>);
  });

  it("wraps SDK publish failures in SNSError", async () => {
    await expect(publishMessage({ topicArn, message: "x" }, failingClient("InvalidParameter"))).rejects.toMatchObject({
      code: "SNS_InvalidParameter",
      message: "SNS publishMessage failed",
    } satisfies Partial<SNSError>);
  });
});
