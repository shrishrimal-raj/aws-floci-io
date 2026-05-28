import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { client } from "../src/client.js";
import {
  changeMessageVisibility,
  createQueue,
  createQueueWithDlq,
  deleteMessage,
  deleteQueue,
  getApproximateQueueCounts,
  purgeQueue,
  receiveMessages,
  sendMessage,
  sendMessageBatch,
} from "../src/use-cases/queues.js";
import { waitForFloci } from "@floci-lab/test-utils";

const suffix = Date.now();
let queueUrl: string;
let deadLetterQueueUrl: string;
let fifoQueueUrl: string;

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

  it("sends batches and reads approximate counts", async () => {
    const ids = await sendMessageBatch(queueUrl, ["one", "two", "three"]);
    expect(ids).toHaveLength(3);

    const counts = await getApproximateQueueCounts(queueUrl);
    expect(counts.visible).toBeGreaterThanOrEqual(0);

    await purgeQueue(queueUrl);
  });

  it("supports FIFO queues", async () => {
    const id = await sendMessage({ queueUrl: fifoQueueUrl, body: "fifo-message", groupId: "group-1" });
    expect(id).toBeTruthy();

    const [message] = await receiveMessages(fifoQueueUrl, 1, 1);
    expect(message?.body).toBe("fifo-message");
    if (message?.receiptHandle) await deleteMessage(fifoQueueUrl, message.receiptHandle);
  });
});
