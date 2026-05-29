#!/usr/bin/env tsx
import {
  createQueueAuditEvent,
  createQueueWithDlq,
  deleteQueue,
  getQueueMetricsSnapshot,
  messageIdempotencyKey,
  parseJsonEnvelope,
  processMessageBatch,
  sendJsonMessage,
} from "../use-cases/queues.js";

interface OrderCreated {
  tenantId: string;
  orderId: string;
  totalCents: number;
}

const name = `floci-sqs-orders-${Date.now()}`;
const { queueUrl, deadLetterQueueUrl } = await createQueueWithDlq(name, 3);
const processed = new Set<string>();

await sendJsonMessage<OrderCreated>(
  queueUrl,
  "order.created",
  { tenantId: "acme-retail", orderId: "ord-1001", totalCents: 12999 },
  "trace-order-1001",
);

const result = await processMessageBatch(queueUrl, async (message) => {
  const envelope = parseJsonEnvelope<OrderCreated>(message.body);
  const key = messageIdempotencyKey(
    envelope.type,
    envelope.payload.tenantId,
    envelope.payload.orderId,
  );
  if (processed.has(key)) return;

  // Real worker would reserve inventory, capture payment, update DynamoDB, then publish SNS/EventBridge event.
  processed.add(key);

  console.log(
    createQueueAuditEvent({
      queueUrl,
      messageId: message.id,
      action: "OrderProcessed",
      outcome: "SUCCESS",
      traceId: envelope.traceId,
      tenantId: envelope.payload.tenantId,
    }),
  );
});

console.log({
  result,
  metrics: await getQueueMetricsSnapshot(queueUrl, { backlogWarning: 1 }),
});

await deleteQueue(queueUrl);
await deleteQueue(deadLetterQueueUrl);
