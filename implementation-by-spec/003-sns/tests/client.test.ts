import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import {
  CreateQueueCommand,
  DeleteQueueCommand,
  GetQueueAttributesCommand,
  SQSClient,
} from "@aws-sdk/client-sqs";
import type { SNSClient } from "@aws-sdk/client-sns";
import { awsDefaults } from "@floci-lab/aws-clients";
import { client } from "../src/client.js";
import type { SNSError } from "../src/errors.js";
import {
  addTopicPermission,
  buildComplianceTopicAttributes,
  createTopic,
  createTopicAuditEvent,
  deleteTopic,
  estimateSnsFanoutCost,
  estimateSnsPublishCost,
  fifoEventIds,
  getTopicAttributes,
  listSubscriptions,
  listTopicTags,
  parseTopicEventEnvelope,
  planSnsAlarms,
  publishFifoJsonEvent,
  publishJsonEvent,
  publishMessage,
  publishMessageWithRetry,
  removeTopicPermission,
  setTopicAttributes,
  setSubscriptionFilterPolicy,
  subscribe,
  subscribeSqsWithFilter,
  summarizeSubscriptions,
  tagTopic,
  topicMessageAttributes,
  untagTopic,
  unsubscribe,
  validateTenantFilterPolicy,
} from "../src/use-cases/topics.js";
import { waitForFloci } from "@floci-lab/test-utils";

const suffix = Date.now();
const sqs = new SQSClient(
  awsDefaults({
    endpoint: process.env.AWS_ENDPOINT_URL ?? "http://localhost:4566",
  }),
);
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
    fifoTopicArn = await createTopic({
      name: `floci-sns-test-${suffix}.fifo`,
      fifo: true,
    });

    const created = await sqs.send(
      new CreateQueueCommand({ QueueName: `floci-sns-test-${suffix}-sink` }),
    );
    queueUrl = created.QueueUrl;
    const attrs = await sqs.send(
      new GetQueueAttributesCommand({
        QueueUrl: queueUrl,
        AttributeNames: ["QueueArn"],
      }),
    );
    queueArn = attrs.Attributes?.QueueArn ?? "";
  }, 30_000);

  afterAll(async () => {
    await unsubscribe(subscriptionArn);
    await deleteTopic(topicArn);
    await deleteTopic(fifoTopicArn);
    if (queueUrl)
      await sqs.send(new DeleteQueueCommand({ QueueUrl: queueUrl }));
  });

  it("client is configured against Floci", () => {
    expect(client).toBeDefined();
  });

  it("subscribes SQS endpoints with filter policies", async () => {
    subscriptionArn = await subscribeSqsWithFilter(topicArn, queueArn, {
      eventType: ["user.created"],
    });

    expect(subscriptionArn).toContain(":");

    await setSubscriptionFilterPolicy(subscriptionArn, {
      eventType: ["user.created", "user.updated"],
    });

    const subscriptions = await listSubscriptions(topicArn);
    expect(
      subscriptions.some(
        (subscription) => subscription.SubscriptionArn === subscriptionArn,
      ),
    ).toBe(true);
    expect(summarizeSubscriptions(subscriptions).total).toBeGreaterThanOrEqual(
      1,
    );
  });

  it("subscribes generic endpoints and cleans them up", async () => {
    const httpSubscriptionArn = await subscribe({
      topicArn,
      protocol: "https",
      endpoint: "https://example.com/sns",
      filterPolicy: { eventType: ["user.created"] },
    });

    expect(httpSubscriptionArn).toBeTruthy();
    await unsubscribe(httpSubscriptionArn);
  });

  it("publishes raw, JSON, retry, and FIFO messages", async () => {
    const attributes = topicMessageAttributes({
      eventType: "user.created",
      tenantId: "tenant-1",
    });
    expect(attributes.eventType?.StringValue).toBe("user.created");

    await expect(
      publishMessage({
        topicArn,
        subject: "User created",
        message: JSON.stringify({ id: "u1" }),
        attributes,
      }),
    ).resolves.toBeTruthy();

    await expect(
      publishMessageWithRetry(
        { topicArn, message: "retry-ok", attributes },
        { attempts: 2, baseDelayMs: 1 },
      ),
    ).resolves.toBeTruthy();

    await expect(
      publishJsonEvent(topicArn, "user.updated", { id: "u2" }, "trace-1"),
    ).resolves.toBeTruthy();

    const ids = fifoEventIds("tenant-1", "user", "user.created", "u3");
    await expect(
      publishFifoJsonEvent(
        fifoTopicArn,
        ids.groupId,
        ids.deduplicationId,
        "user.created",
        { id: "u3" },
      ),
    ).resolves.toBeTruthy();
  });

  it("parses envelopes, creates audit events, and estimates cost", () => {
    const envelope = parseTopicEventEnvelope<{ id: string }>(
      JSON.stringify({
        type: "user.created",
        payload: { id: "u1" },
        createdAt: new Date().toISOString(),
      }),
    );
    expect(envelope.payload.id).toBe("u1");

    const audit = createTopicAuditEvent({
      topicArn,
      action: "UserPublished",
      outcome: "PUBLISHED",
    });
    expect(audit.eventId).toContain("sns-");

    const estimate = estimateSnsPublishCost({ publishes: 2_000_000 });
    expect(estimate.billablePublishes).toBe(1_000_000);
    expect(estimate.publishUsd).toBeCloseTo(0.5);

    const fanout = estimateSnsFanoutCost({
      publishes: 2_000_000,
      averageDeliveriesPerPublish: 2,
    });
    expect(fanout.totalRequests).toBe(6_000_000);
    expect(fanout.billableRequests).toBe(5_000_000);

    expect(
      validateTenantFilterPolicy({ tenantId: ["tenant-1", "tenant-2"] }, "tenant-1"),
    ).toBe(true);
    expect(validateTenantFilterPolicy({ eventType: ["x"] }, "tenant-1")).toBe(
      false,
    );

    const complianceAttrs = buildComplianceTopicAttributes("alias/pii-key", {
      displayName: "pii-events",
      enforceSslOnlyPolicy: true,
    });
    expect(complianceAttrs.KmsMasterKeyId).toBe("alias/pii-key");
    expect(complianceAttrs.DisplayName).toBe("pii-events");
    expect(complianceAttrs.Policy).toContain("DenyInsecureTransport");

    const alarms = planSnsAlarms("orders-events");
    expect(alarms).toHaveLength(4);
    expect(alarms[0]?.name).toContain("publish-failures");
  });

  it("manages topic attributes, tags, and permissions via SNS API", async () => {
    const mocked = {
      send: vi.fn(async (command: object) => {
        const name = command.constructor.name;
        if (name === "GetTopicAttributesCommand") {
          return { Attributes: { DisplayName: "orders-events" } };
        }
        if (name === "ListTagsForResourceCommand") {
          return {
            Tags: [
              { Key: "Environment", Value: "prod" },
              { Key: "TenantId", Value: "tenant-1" },
            ],
          };
        }
        return {};
      }),
    } as unknown as SNSClient;

    await expect(
      setTopicAttributes(topicArn, { DisplayName: "orders-events" }, mocked),
    ).resolves.toBeUndefined();

    await expect(tagTopic(topicArn, { Environment: "prod" }, mocked)).resolves
      .toBeUndefined();

    await expect(untagTopic(topicArn, ["Environment"], mocked)).resolves
      .toBeUndefined();

    await expect(
      addTopicPermission(
        topicArn,
        "allow-external-publish",
        ["123456789012"],
        ["Publish"],
        mocked,
      ),
    ).resolves.toBeUndefined();

    await expect(
      removeTopicPermission(topicArn, "allow-external-publish", mocked),
    ).resolves.toBeUndefined();

    await expect(getTopicAttributes(topicArn, mocked)).resolves.toEqual({
      DisplayName: "orders-events",
    });

    await expect(listTopicTags(topicArn, mocked)).resolves.toEqual({
      Environment: "prod",
      TenantId: "tenant-1",
    });
  });

  it("wraps SDK create failures in SNSError", async () => {
    await expect(
      createTopic({ name: "x" }, failingClient("AuthorizationError")),
    ).rejects.toMatchObject({
      code: "SNS_AuthorizationError",
      message: "SNS createTopic failed",
    } satisfies Partial<SNSError>);
  });

  it("wraps SDK publish failures in SNSError", async () => {
    await expect(
      publishMessage(
        { topicArn, message: "x" },
        failingClient("InvalidParameter"),
      ),
    ).rejects.toMatchObject({
      code: "SNS_InvalidParameter",
      message: "SNS publishMessage failed",
    } satisfies Partial<SNSError>);
  });
});
