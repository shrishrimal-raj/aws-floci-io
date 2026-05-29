# 002 - SQS

> Managed queues with standard delivery, FIFO ordering, visibility timeouts, dead-letter queues, JSON envelopes, and worker processing.

## Quick start

```bash
docker compose up -d
pnpm install
cd implementation-by-spec/002-sqs
pnpm setup
pnpm seed
pnpm test
pnpm cleanup
```

## Module

- `src/client.ts` - SQS SDK v3 client for Floci (`http://localhost:4566`).
- `src/use-cases/queues.ts` - queue creation, DLQ wiring, send/receive/delete, JSON envelopes, FIFO sends, visibility, purge, counts.
- `src/examples/basic-queue.ts` - runnable standard queue + DLQ example.
- `src/examples/json-worker.ts` - typed JSON event + worker delete-after-success flow.
- `src/examples/fifo-ordering.ts` - FIFO queue send/receive with group and deduplication IDs.
- `scripts/setup.ts` - creates standard queue with DLQ and FIFO queue.
- `scripts/seed.ts` - sends fixture messages.
- `scripts/cleanup.ts` - deletes created queues.

## Operations covered

| Operation | Function | Notes |
|---|---|---|
| Create queue | `createQueue` | Supports standard/FIFO, retention, long polling, visibility timeout. |
| Lookup queue | `getQueueUrl`, `getQueueArn` | URL for API calls; ARN for IAM and redrive policy. |
| Create DLQ pair | `createQueueWithDlq` | Creates `name-dlq`, reads ARN, wires redrive policy. |
| Send message | `sendMessage` | Supports delay, attributes, FIFO group/dedup IDs. |
| Send JSON event | `sendJsonMessage` | Wraps payload with `type`, `traceId`, `createdAt`; adds message attributes. |
| Send FIFO payload | `sendFifoMessage` | Uses stable message group and deduplication IDs. |
| Send batch | `sendMessageBatch` | Up to 10 messages/request. |
| Receive messages | `receiveMessages` | Long-polls and returns message attributes/system attributes. |
| Worker processing | `processOneMessage` | Deletes only after handler succeeds. |
| Visibility timeout | `changeMessageVisibility` | Extend work lease or make message immediately visible. |
| Queue depth | `getApproximateQueueCounts` | Visible, in-flight, delayed counts for metrics/alarms. |
| Cleanup | `purgeQueue`, `deleteQueue` | Purge messages or delete queues idempotently. |

## Use cases

```ts
import { createQueueWithDlq, sendJsonMessage, processOneMessage, deleteQueue } from "./src/index.js";

const { queueUrl, deadLetterQueueUrl } = await createQueueWithDlq("orders", 3);
await sendJsonMessage(queueUrl, "order.created", { orderId: "o1" }, "trace-1");

await processOneMessage(queueUrl, async (message) => {
  // parse and process message.body here
  console.log(message.body);
});

await deleteQueue(queueUrl);
await deleteQueue(deadLetterQueueUrl);
```

## Runbook

1. Start Floci: `docker compose up -d`.
2. Check health: `pnpm run floci:health` from repo root.
3. Provision queues: `pnpm setup`.
4. Seed fixtures: `pnpm seed`.
5. Run tests: `pnpm test`.
6. Cleanup queues: `pnpm cleanup`.

## Gotchas

- SQS is at-least-once. Handlers must be idempotent and safe for duplicate messages.
- Delete only after successful processing. Un-deleted messages reappear after visibility timeout.
- Tune visibility timeout to max worker runtime; extend with `changeMessageVisibility` for long jobs.
- Use DLQs for poison messages and alarm on DLQ depth.
- FIFO queues require `.fifo` names and message group IDs. Throughput is lower than standard queues.
- Batch sends max 10 messages/request. Large payloads should store data in S3 and send pointers.

## Floci vs Real AWS

Floci support: **full** for this lab. On real AWS, tune long polling and visibility timeout to worker SLA, set CloudWatch alarms for age/depth/DLQ depth, use least-privilege IAM per queue ARN, configure encryption where required, and budget for request volume. Real AWS has regional queue URLs/ARNs, at-least-once delivery, approximate metrics, FIFO throughput limits, message size limits, and purge cooldown behavior.
