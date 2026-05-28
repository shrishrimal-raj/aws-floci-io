# 002 - SQS

> Managed queues: standard, FIFO, visibility timeout, and DLQs.

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
- `src/use-cases/queues.ts` - queue creation, DLQ wiring, send/receive/delete, visibility, purge, counts.
- `src/examples/basic-queue.ts` - runnable standard queue + DLQ example.
- `scripts/setup.ts` - creates standard queue with DLQ and FIFO queue.
- `scripts/seed.ts` - sends fixture messages.
- `scripts/cleanup.ts` - deletes created queues.

## Use cases

```ts
import { createQueueWithDlq, sendMessage, receiveMessages, deleteMessage } from "./src/index.js";

const { queueUrl } = await createQueueWithDlq("orders", 3);
await sendMessage({ queueUrl, body: JSON.stringify({ orderId: "o1" }) });

const [message] = await receiveMessages(queueUrl, 1, 5);
if (message?.receiptHandle) {
  // process message body first
  await deleteMessage(queueUrl, message.receiptHandle);
}
```

## Runbook

1. Start Floci: `docker compose up -d`.
2. Check health: `pnpm run floci:health` from repo root.
3. Provision queues: `pnpm setup`.
4. Seed fixtures: `pnpm seed`.
5. Run tests: `pnpm test`.
6. Cleanup queues: `pnpm cleanup`.

## Floci vs Real AWS

Floci support: **full** for this lab. On real AWS, tune visibility timeout to worker SLA, use DLQs for poison messages, make handlers idempotent, alarm on DLQ depth, use long polling, and use FIFO only when strict ordering/deduplication is required.
