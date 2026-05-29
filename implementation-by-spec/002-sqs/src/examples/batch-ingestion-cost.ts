#!/usr/bin/env tsx
import {
  createQueue,
  deleteQueue,
  estimateSqsRequestCost,
  getApproximateQueueCounts,
  purgeQueue,
  receiveMessages,
  sendMessageBatch,
} from "../use-cases/queues.js";

const queueUrl = await createQueue({
  name: `floci-sqs-batch-ingestion-${Date.now()}`,
  receiveWaitTimeSeconds: 10,
  messageRetentionSeconds: 4 * 24 * 60 * 60,
});

const ids = await sendMessageBatch(queueUrl, [
  JSON.stringify({ type: "lead.imported", leadId: "lead-1" }),
  JSON.stringify({ type: "lead.imported", leadId: "lead-2" }),
  JSON.stringify({ type: "lead.imported", leadId: "lead-3" }),
]);

const messages = await receiveMessages(queueUrl, 3, 1);
const estimate = estimateSqsRequestCost({ requests: 25_000_000 });

console.log({
  useCase:
    "CRM bulk import buffers bursts before workers write to DynamoDB/RDS",
  sentMessageIds: ids,
  received: messages.map((message) => message.body),
  counts: await getApproximateQueueCounts(queueUrl),
  monthlyRequestCostEstimate: estimate,
});

await purgeQueue(queueUrl);
await deleteQueue(queueUrl);
