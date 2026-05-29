# 003 - SNS

> Pub/sub topics with SQS/Lambda/HTTP/email/SMS-style subscriptions, message attributes, filter policies, JSON events, and FIFO publishing.

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
- `src/use-cases/topics.ts` - topics, subscriptions, SQS filter helpers, JSON events, FIFO publish, cleanup.
- `src/examples/basic-topic.ts` - runnable topic + subscription example.
- `src/examples/json-event.ts` - typed JSON event publish with filterable attributes.
- `src/examples/fifo-topic.ts` - FIFO topic publish with group and deduplication IDs.
- `scripts/setup.ts` - creates standard and FIFO topics plus filtered SQS subscription.
- `scripts/seed.ts` - publishes fixture event.
- `scripts/cleanup.ts` - unsubscribes and deletes topics.

## Operations covered

| Operation | Function | Notes |
|---|---|---|
| Create topic | `createTopic` | Supports standard/FIFO and display name. |
| Delete topic | `deleteTopic` | Idempotent cleanup for missing topics. |
| Subscribe endpoint | `subscribe` | Supports SQS, Lambda, HTTP/S, email, SMS, application protocols. |
| SQS filtered fanout | `subscribeSqsWithFilter` | Raw message delivery with filter policy. |
| Update filter | `setSubscriptionFilterPolicy` | Changes subscription routing without recreating topic. |
| Unsubscribe | `unsubscribe` | Idempotent cleanup for missing subscriptions. |
| Publish raw message | `publishMessage` | Supports subject, message attributes, FIFO fields. |
| Publish JSON event | `publishJsonEvent` | Wraps payload with `type`, `traceId`, `createdAt`; adds filterable attributes. |
| Publish FIFO JSON event | `publishFifoJsonEvent` | Adds message group and deduplication IDs for ordered streams. |
| List subscriptions | `listSubscriptions` | Handles pagination for topic subscriptions. |

## Use cases

```ts
import { createTopic, subscribeSqsWithFilter, publishJsonEvent, deleteTopic } from "./src/index.js";

const topicArn = await createTopic({ name: "users" });
await subscribeSqsWithFilter(topicArn, "arn:aws:sqs:us-east-1:000000000000:user-worker", {
  eventType: ["user.created"],
});

await publishJsonEvent(topicArn, "user.created", { userId: "u1" }, "trace-1");
await deleteTopic(topicArn);
```

## Runbook

1. Start Floci: `docker compose up -d`.
2. Check health: `pnpm run floci:health` from repo root.
3. Provision topics/subscriptions: `pnpm setup`.
4. Seed event: `pnpm seed`.
5. Run tests: `pnpm test`.
6. Cleanup: `pnpm cleanup`.

## Gotchas

- SNS fanout requires subscriber-side permissions in real AWS, especially SQS queue policies.
- Filter policies match message attributes, not arbitrary JSON body fields.
- Raw message delivery changes SQS payload shape. Consumers must expect raw body vs SNS envelope.
- FIFO topics require `.fifo` names plus message group IDs. Deduplication ID needed unless content-based dedup is enabled.
- HTTP/S subscribers need retry-safe idempotent handlers. Use DLQs or delivery status logging for failure visibility.
- Email/SMS subscriptions require confirmation and may not behave like local emulator shortcuts.

## Floci vs Real AWS

Floci support: **full** for this lab. On real AWS, add topic policies for cross-account publishers, queue policies for SQS fanout, retries/DLQs for HTTP/Lambda consumers, delivery failure alarms, KMS encryption for sensitive events, and least-privilege IAM per topic ARN. Real AWS also has subscription confirmation flows, regional ARNs, FIFO throughput limits, SMS/email sandbox and spend controls, and delivery status metrics.
