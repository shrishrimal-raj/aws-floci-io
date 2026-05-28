# 003 - SNS

> Pub/sub topics with SQS/Lambda/HTTP/email/SMS-style subscriptions, message attributes, filters, and FIFO publishing.

## Quick start

```bash
docker compose up -d
pnpm install
cd implementation-by-spec/003-sns
pnpm setup
pnpm seed
pnpm test
pnpm cleanup
```

## Module

- `src/client.ts` - SNS SDK v3 client for Floci (`http://localhost:4566`).
- `src/use-cases/topics.ts` - topics, subscriptions, filter policies, publish, cleanup.
- `src/examples/basic-topic.ts` - runnable topic + subscription example.
- `scripts/setup.ts` - creates standard and FIFO topics plus filtered SQS subscription.
- `scripts/seed.ts` - publishes fixture event.
- `scripts/cleanup.ts` - unsubscribes and deletes topics.

## Use cases

```ts
import { createTopic, subscribe, publishMessage } from "./src/index.js";

const topicArn = await createTopic({ name: "orders" });
await subscribe({
  topicArn,
  protocol: "sqs",
  endpoint: "arn:aws:sqs:us-east-1:000000000000:orders-worker",
  filterPolicy: { eventType: ["order.created"] },
  rawMessageDelivery: true,
});

await publishMessage({
  topicArn,
  message: JSON.stringify({ orderId: "o1" }),
  attributes: { eventType: { DataType: "String", StringValue: "order.created" } },
});
```

## Runbook

1. Start Floci: `docker compose up -d`.
2. Check health: `pnpm run floci:health` from repo root.
3. Provision topics/subscriptions: `pnpm setup`.
4. Seed event: `pnpm seed`.
5. Run tests: `pnpm test`.
6. Cleanup: `pnpm cleanup`.

## Floci vs Real AWS

Floci support: **full** for this lab. On real AWS, add topic policies for cross-account publishers, queue policies for SQS fanout, retries/DLQs for HTTP/Lambda consumers, alarms on delivery failures, and encryption for sensitive events.
