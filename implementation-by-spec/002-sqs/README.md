# 002 - SQS

> Enterprise queueing with standard/FIFO queues, DLQs, visibility timeouts, JSON envelopes, batch workers, audit events, observability snapshots, and request cost modeling.

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
- `src/use-cases/queues.ts` - queue creation, DLQ wiring, send/receive/delete, JSON envelopes, FIFO, visibility, batch workers, audit, metrics, cost.
- `src/examples/basic-queue.ts` - standard queue + DLQ send/receive/delete.
- `src/examples/json-worker.ts` - typed JSON event and delete-after-success worker.
- `src/examples/fifo-ordering.ts` - FIFO group/deduplication example.
- `src/examples/order-processing-dlq.ts` - ecommerce order worker with idempotency, DLQ, audit, metrics.
- `src/examples/secure-tenant-work-queue.ts` - tenant-scoped export job with queue URL/ARN lookup and prefix validation.
- `src/examples/visibility-timeout-retry.ts` - long job heartbeat, retry, and DLQ pattern.
- `src/examples/batch-ingestion-cost.ts` - batch ingestion, queue counts, purge, cost estimate.
- `src/examples/event-fanout-integration.ts` - EventBridge/SNS-style fanout payload into SQS.
- `scripts/setup.ts` - creates standard queue with DLQ and FIFO queue.
- `scripts/seed.ts` - sends fixture messages.
- `scripts/cleanup.ts` - deletes created queues.

## Operations covered

| Operation       | Function                                                                        | Notes                                                               |
| --------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Create queue    | `createQueue`                                                                   | Standard/FIFO, retention, long polling, visibility timeout.         |
| Lookup queue    | `getQueueUrl`, `getQueueArn`                                                    | URL for API calls; ARN for IAM/redrive policies.                    |
| Create DLQ pair | `createQueueWithDlq`                                                            | Creates DLQ, reads ARN, wires redrive policy.                       |
| Send message    | `sendMessage`                                                                   | Delay, attributes, FIFO group/dedup IDs.                            |
| Send JSON event | `sendJsonMessage`                                                               | Adds `type`, `payload`, `traceId`, `createdAt`, message attributes. |
| Parse envelope  | `parseJsonEnvelope`                                                             | Validates worker input shape before business logic.                 |
| FIFO send       | `sendFifoMessage`                                                               | Stable group and deduplication IDs.                                 |
| Batch send      | `sendMessageBatch`                                                              | Up to 10 messages/request.                                          |
| Receive         | `receiveMessages`                                                               | Long-polls with attributes.                                         |
| Worker          | `processOneMessage`, `processMessageBatch`                                      | Delete only after success; failed batch items retry.                |
| Idempotency     | `messageIdempotencyKey`                                                         | Stable duplicate-safe worker key.                                   |
| Visibility      | `changeMessageVisibility`                                                       | Extend work lease or requeue immediately.                           |
| Observability   | `getApproximateQueueCounts`, `getQueueMetricsSnapshot`, `createQueueAuditEvent` | Queue depth metrics, alarm hints, audit payloads.                   |
| Cost            | `estimateSqsRequestCost`                                                        | Simple request-volume estimate.                                     |
| Cleanup         | `purgeQueue`, `deleteQueue`, `deleteMessage`                                    | Purge backlog, delete queue, delete processed message.              |

## Function examples

### Order worker with DLQ, idempotency, and audit

```ts
const { queueUrl, deadLetterQueueUrl } = await createQueueWithDlq("orders", 3);
await sendJsonMessage(
  queueUrl,
  "order.created",
  { tenantId: "acme", orderId: "o1" },
  "trace-1",
);

await processMessageBatch(queueUrl, async (message) => {
  const envelope = parseJsonEnvelope<{ tenantId: string; orderId: string }>(
    message.body,
  );
  const key = messageIdempotencyKey(
    envelope.type,
    envelope.payload.tenantId,
    envelope.payload.orderId,
  );
  console.log(
    key,
    createQueueAuditEvent({
      queueUrl,
      action: "OrderProcessed",
      outcome: "SUCCESS",
    }),
  );
});
```

### Long-running job heartbeat

```ts
const [message] = await receiveMessages(queueUrl, 1, 1);
if (message?.receiptHandle) {
  await changeMessageVisibility(queueUrl, message.receiptHandle, 60);
  // process durable side effects
  await deleteMessage(queueUrl, message.receiptHandle);
}
```

### Observability and cost

```ts
const snapshot = await getQueueMetricsSnapshot(queueUrl, {
  backlogWarning: 1000,
});
const estimate = estimateSqsRequestCost({ requests: 25_000_000 });
```

## Real-world scenarios

- **Order processing** - API accepts checkout, SQS buffers work, workers update DynamoDB/RDS, publish SNS/EventBridge events, and DLQ poison messages.
- **Secure tenant jobs** - message contains tenant ID and S3 prefix; worker validates tenant scope before exports or deletes.
- **Audit logging** - workers emit `createQueueAuditEvent` payloads to logs, S3, CloudWatch, or a compliance topic.
- **Error handling and retries** - failed handlers do not delete messages; visibility timeout controls retry; DLQ captures repeated failures.
- **Data lifecycle** - message retention is short-lived by design; durable state belongs in DynamoDB/RDS/S3, not SQS.
- **Event-driven integration** - SNS/EventBridge can target SQS to decouple producers from slow consumers.
- **Monitoring** - alarm on visible backlog, oldest message age, in-flight messages, worker errors, and DLQ depth.
- **Cost optimization** - long polling reduces empty receives; batching reduces request count; keep payloads small and store large data in S3.
- **Compliance** - use SSE/KMS where required, least-privilege IAM per queue ARN, tenant IDs in payloads/logs, and audit events for processing outcomes.

## Runbook

1. Start Floci: `docker compose up -d`.
2. Check health: `pnpm run floci:health` from repo root.
3. Provision queues: `pnpm setup`.
4. Seed fixtures: `pnpm seed`.
5. Run tests: `pnpm test`.
6. Run examples: `pnpm exec tsx src/examples/<file>.ts`.
7. Cleanup queues: `pnpm cleanup`.

## Testing guidance

- Cover send, receive, delete, DLQ creation, FIFO, batch sends, visibility changes, purge, counts, parsing, idempotency, and failure wrapping.
- Test that handlers delete only after success.
- Test failed batch messages remain available for retry/DLQ.
- In production apps, add load tests for worker concurrency, backlog drain rate, and duplicate delivery.

## Production checklist

- [ ] Every worker is idempotent.
- [ ] DLQ exists and has CloudWatch alarm/runbook.
- [ ] Visibility timeout exceeds max worker runtime or worker heartbeats with `changeMessageVisibility`.
- [ ] Long polling enabled to reduce empty receive cost.
- [ ] Batch send/receive tuned for throughput.
- [ ] Queue policy/IAM scoped to exact queue ARN.
- [ ] Sensitive queues use encryption where required.
- [ ] Large payloads stored in S3; SQS message carries pointer.
- [ ] Metrics and audit logs include tenant, trace ID, message type, and outcome.

## Gotchas

- SQS is at-least-once. Duplicate messages are normal.
- Standard queues do not guarantee strict ordering.
- FIFO queues require `.fifo` names and message group IDs; throughput is lower.
- Delete only after successful durable side effects.
- Batch sends max 10 messages/request.
- Queue metrics are approximate.
- Purge has cooldown behavior on real AWS.

## Floci vs Real AWS

Floci support: **full** for this lab. On real AWS, verify IAM, encryption, quotas, FIFO throughput, purge cooldown, regional URLs/ARNs, CloudWatch metrics, DLQ redrive, and request costs. Tune long polling, visibility timeout, retention, worker concurrency, and alarm thresholds to production SLA.
