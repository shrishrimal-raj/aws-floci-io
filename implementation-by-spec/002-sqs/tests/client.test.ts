import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import type { SQSClient } from "@aws-sdk/client-sqs";
import { client } from "../src/client.js";
import type { SQSError } from "../src/errors.js";
import {
  changeMessageVisibility,
  createQueue,
  createQueueAuditEvent,
  createQueueWithDlq,
  deleteMessage,
  deleteQueue,
  estimateSqsRequestCost,
  getApproximateQueueCounts,
  getQueueArn,
  getQueueMetricsSnapshot,
  getQueueUrl,
  messageIdempotencyKey,
  parseJsonEnvelope,
  processMessageBatch,
  processOneMessage,
  purgeQueue,
  receiveMessages,
  sendFifoMessage,
  sendJsonMessage,
  sendMessage,
  sendMessageBatch,
} from "../src/use-cases/queues.js";
import { waitForFloci } from "@floci-lab/test-utils";

const suffix = Date.now();
let queueUrl: string;
let deadLetterQueueUrl: string;
let fifoQueueUrl: string;

function failingClient(name: string): SQSClient {
  return {
    send: vi.fn(async () => {
      const error = new Error(`${name} failed`);
      error.name = name;
      throw error;
    }),
  } as unknown as SQSClient;
}

describe("SQS", () => {
  beforeAll(async () => {
    await waitForFloci();
    const pair = await createQueueWithDlq(`floci-sqs-test-${suffix}`);
    queueUrl = pair.queueUrl;
    deadLetterQueueUrl = pair.deadLetterQueueUrl;
    fifoQueueUrl = await createQueue({
      name: `floci-sqs-test-${suffix}.fifo`,
      fifo: true,
    });
  });

  afterAll(async () => {
    await deleteQueue(queueUrl);
    await deleteQueue(deadLetterQueueUrl);
    await deleteQueue(fifoQueueUrl);
  });

  it("client is configured against Floci", () => {
    expect(client).toBeDefined();
  });

  it("sends, receives, changes visibility, and deletes messages", async () => {
    await sendMessage({ queueUrl, body: JSON.stringify({ id: "job-1" }) });

    const [message] = await receiveMessages(queueUrl, 1, 1);
    expect(message?.body).toContain("job-1");
    expect(message?.receiptHandle).toBeTruthy();

    await changeMessageVisibility(queueUrl, message!.receiptHandle!, 0);
    await deleteMessage(queueUrl, message!.receiptHandle!);
  });

  it("sends typed JSON messages and deletes after handler success", async () => {
    await sendJsonMessage(
      queueUrl,
      "order.created",
      { orderId: "o-1" },
      "trace-1",
    );

    const handled: string[] = [];
    const result = await processOneMessage(queueUrl, async (message) => {
      const envelope = parseJsonEnvelope<{ orderId: string }>(message.body);
      handled.push(message.body ?? "");
      expect(envelope.payload.orderId).toBe("o-1");
      expect(
        messageIdempotencyKey(
          envelope.type,
          "tenant-1",
          envelope.payload.orderId,
        ),
      ).toBe("sqs#order.created#tenant-1#o-1");
    });

    expect(result).toMatchObject({ processed: true, deleted: true });
    expect(handled[0]).toContain("order.created");
    expect(handled[0]).toContain("trace-1");
  });

  it("processes batches and leaves failed messages for retry", async () => {
    await sendMessageBatch(queueUrl, ["batch-ok", "batch-fail"]);

    const result = await processMessageBatch(queueUrl, async (message) => {
      if (message.body === "batch-fail") throw new Error("transient");
    });

    expect(result.received).toBeGreaterThanOrEqual(2);
    expect(result.processed).toBeGreaterThanOrEqual(1);
    expect(result.failed).toBeGreaterThanOrEqual(1);
    await purgeQueue(queueUrl);
  });

  it("sends batches and reads approximate counts", async () => {
    const ids = await sendMessageBatch(queueUrl, ["one", "two", "three"]);
    expect(ids).toHaveLength(3);

    const counts = await getApproximateQueueCounts(queueUrl);
    expect(counts.visible).toBeGreaterThanOrEqual(0);

    const snapshot = await getQueueMetricsSnapshot(queueUrl, {
      backlogWarning: 0,
    });
    expect(snapshot.backlog).toBeGreaterThanOrEqual(0);
    expect(snapshot.alarmHints).toContain("BacklogHigh");

    const estimate = estimateSqsRequestCost({ requests: 2_000_000 });
    expect(estimate.billableRequests).toBe(1_000_000);
    expect(estimate.requestUsd).toBeCloseTo(0.4);

    await purgeQueue(queueUrl);
  });

  it("resolves queue URL, ARN, and creates audit events", async () => {
    await expect(getQueueUrl(`floci-sqs-test-${suffix}`)).resolves.toBe(
      queueUrl,
    );
    await expect(getQueueArn(queueUrl)).resolves.toContain(
      `floci-sqs-test-${suffix}`,
    );

    const audit = createQueueAuditEvent({
      queueUrl,
      action: "OrderProcessed",
      outcome: "SUCCESS",
      traceId: "trace-1",
      tenantId: "tenant-1",
    });
    expect(audit.eventId).toContain("sqs-");
    expect(audit.timestamp).toBeTruthy();
  });

  it("supports FIFO queues", async () => {
    const id = await sendFifoMessage(
      fifoQueueUrl,
      "group-1",
      `dedupe-${Date.now()}`,
      { type: "fifo-message" },
    );
    expect(id).toBeTruthy();

    const [message] = await receiveMessages(fifoQueueUrl, 1, 1);
    expect(message?.body).toContain("fifo-message");
    if (message?.receiptHandle)
      await deleteMessage(fifoQueueUrl, message.receiptHandle);
  });

  it("wraps SDK send failures in SQSError", async () => {
    await expect(
      sendMessage({ queueUrl, body: "x" }, failingClient("AccessDenied")),
    ).rejects.toMatchObject({
      code: "SQS_AccessDenied",
      message: "SQS sendMessage failed",
    } satisfies Partial<SQSError>);
  });

  it("wraps SDK receive failures in SQSError", async () => {
    await expect(
      receiveMessages(queueUrl, 1, 1, failingClient("QueueDoesNotExist")),
    ).rejects.toMatchObject({
      code: "SQS_QueueDoesNotExist",
      message: "SQS receiveMessages failed",
    } satisfies Partial<SQSError>);
  });
});
