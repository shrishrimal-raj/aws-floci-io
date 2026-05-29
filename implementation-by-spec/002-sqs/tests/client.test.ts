import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import type { SQSClient } from "@aws-sdk/client-sqs";
import { client } from "../src/client.js";
import type { SQSError } from "../src/errors.js";
import {
  changeMessageVisibility,
  createQueue,
  createQueueWithDlq,
  deleteMessage,
  deleteQueue,
  getApproximateQueueCounts,
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
    fifoQueueUrl = await createQueue({ name: `floci-sqs-test-${suffix}.fifo`, fifo: true });
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
    await sendJsonMessage(queueUrl, "order.created", { orderId: "o-1" }, "trace-1");

    const handled: string[] = [];
    const result = await processOneMessage(queueUrl, async (message) => {
      handled.push(message.body ?? "");
    });

    expect(result).toMatchObject({ processed: true, deleted: true });
    expect(handled[0]).toContain("order.created");
    expect(handled[0]).toContain("trace-1");
  });

  it("sends batches and reads approximate counts", async () => {
    const ids = await sendMessageBatch(queueUrl, ["one", "two", "three"]);
    expect(ids).toHaveLength(3);

    const counts = await getApproximateQueueCounts(queueUrl);
    expect(counts.visible).toBeGreaterThanOrEqual(0);

    await purgeQueue(queueUrl);
  });

  it("supports FIFO queues", async () => {
    const id = await sendFifoMessage(fifoQueueUrl, "group-1", `dedupe-${Date.now()}`, { type: "fifo-message" });
    expect(id).toBeTruthy();

    const [message] = await receiveMessages(fifoQueueUrl, 1, 1);
    expect(message?.body).toContain("fifo-message");
    if (message?.receiptHandle) await deleteMessage(fifoQueueUrl, message.receiptHandle);
  });

  it("wraps SDK send failures in SQSError", async () => {
    await expect(sendMessage({ queueUrl, body: "x" }, failingClient("AccessDenied"))).rejects.toMatchObject({
      code: "SQS_AccessDenied",
      message: "SQS sendMessage failed",
    } satisfies Partial<SQSError>);
  });

  it("wraps SDK receive failures in SQSError", async () => {
    await expect(receiveMessages(queueUrl, 1, 1, failingClient("QueueDoesNotExist"))).rejects.toMatchObject({
      code: "SQS_QueueDoesNotExist",
      message: "SQS receiveMessages failed",
    } satisfies Partial<SQSError>);
  });
});
