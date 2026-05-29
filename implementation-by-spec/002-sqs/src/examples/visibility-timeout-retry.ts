#!/usr/bin/env tsx
import {
  changeMessageVisibility,
  createQueueWithDlq,
  deleteMessage,
  deleteQueue,
  receiveMessages,
  sendJsonMessage,
} from "../use-cases/queues.js";

const { queueUrl, deadLetterQueueUrl } = await createQueueWithDlq(
  `floci-sqs-retry-${Date.now()}`,
  3,
);

await sendJsonMessage(
  queueUrl,
  "video.transcode.requested",
  { tenantId: "media-co", assetId: "asset-77", source: "s3://media/input.mp4" },
  "trace-video-77",
);

const [message] = await receiveMessages(queueUrl, 1, 1);
if (message?.receiptHandle) {
  // Worker heartbeat: job needs more time, so extend invisibility before timeout expires.
  await changeMessageVisibility(queueUrl, message.receiptHandle, 60);

  console.log({
    messageId: message.id,
    retryPattern:
      "on transient failure, do not delete; message returns after visibility timeout and later moves to DLQ",
    body: message.body,
  });

  // This example succeeds after extending; delete only after durable side effects complete.
  await deleteMessage(queueUrl, message.receiptHandle);
}

await deleteQueue(queueUrl);
await deleteQueue(deadLetterQueueUrl);
