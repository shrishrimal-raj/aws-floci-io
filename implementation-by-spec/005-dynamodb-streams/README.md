# 005 - DynamoDB Streams

> Enterprise change data capture for DynamoDB with stream discovery, shard reads, record summaries, idempotency keys, audit events, lag snapshots, and Lambda consumer cost modeling.

## Quick start

```bash
docker compose up -d
pnpm install
cd implementation-by-spec/005-dynamodb-streams
pnpm setup
pnpm seed
pnpm test
pnpm cleanup
```

## Module

- `src/client.ts` - DynamoDB Streams SDK v3 client for Floci (`http://localhost:4566`).
- `src/use-cases/streams.ts` - stream discovery, shard iterators, reads, summaries, JSON conversion, idempotency, audit, processing, lag, cost.
- `src/examples/list-shards.ts` - lists shard IDs for latest table stream.
- `src/examples/read-stream.ts` - reads records from latest stream for `DDB_STREAMS_TABLE`.
- `src/examples/summarize-record.ts` - converts raw record into handler-friendly summary.
- `src/examples/audit-log-projection.ts` - projects inserts to audit/search/log sinks with idempotency.
- `src/examples/outbox-event-publisher.ts` - outbox pattern for publishing to SNS/EventBridge/SQS.
- `src/examples/cache-invalidation-worker.ts` - reacts to modifies by invalidating Redis/OpenSearch/CloudFront projections.
- `src/examples/lifecycle-delete-processor.ts` - handles REMOVE events from TTL/session cleanup.
- `src/examples/observability-cost-tuning.ts` - lag snapshot, summaries, Lambda consumer request-cost estimate.
- `scripts/setup.ts` - creates stream-enabled source table.
- `scripts/seed.ts` - writes fixture changes that produce stream records.
- `scripts/cleanup.ts` - deletes source table.

## Operations covered

| Operation            | Function                                                | Notes                                                  |
| -------------------- | ------------------------------------------------------- | ------------------------------------------------------ |
| Discover streams     | `listTableStreams`, `latestStreamArn`, `describeStream` | Find current stream ARN and stream metadata.           |
| Shards/iterators     | `shardIds`, `getShardIterator`                          | Build iterators from `TRIM_HORIZON` or `LATEST`.       |
| Read records         | `readShardRecords`, `readRecords`                       | Read one batch from one shard or every shard.          |
| Summaries            | `summarizeRecord`, `summarizeRecords`                   | Extract event name, keys, images, sequence, timestamp. |
| JSON conversion      | `attributeMapToJson`                                    | Convert AttributeValue maps for projections/logs.      |
| Idempotency          | `streamRecordIdempotencyKey`                            | Stable duplicate-safe processor key.                   |
| Audit                | `createStreamAuditEvent`                                | Structured processor outcome payload.                  |
| Filtering/processing | `filterRecordsByEventName`, `processStreamRecords`      | Route INSERT/MODIFY/REMOVE and track results.          |
| Observability/cost   | `streamLagSnapshot`, `estimateStreamConsumerCost`       | Iterator-age style alarms and Lambda request estimate. |

## Function examples

### Process stream records idempotently

```ts
const records = await readRecords(streamArn, 100);
await processStreamRecords(records, async (record) => {
  const key = streamRecordIdempotencyKey(record);
  const image = attributeMapToJson(record.dynamodb?.NewImage);
  console.log(
    key,
    image,
    createStreamAuditEvent(record, "ProjectOrder", "PROCESSED"),
  );
});
```

### Route outbox inserts

```ts
const inserts = filterRecordsByEventName(records, "INSERT");
const summaries = summarizeRecords(inserts);
```

### Monitor lag and cost

```ts
const lag = streamLagSnapshot(records, 60_000);
const cost = estimateStreamConsumerCost({
  recordsPerMonth: 10_000_000,
  batchSize: 100,
});
```

## Real-world scenarios

- **Event-driven processing** - publish outbox rows to SNS/EventBridge/SQS after DynamoDB writes commit.
- **Audit logging** - create immutable audit events from `NEW_AND_OLD_IMAGES` and send to CloudWatch/S3/OpenSearch/SIEM.
- **Secure access patterns** - Lambda consumer IAM should allow only specific table stream ARN and downstream resources.
- **Error handling and retries** - consumers must be idempotent; use partial batch failure, DLQ/on-failure destination, and max record age in Lambda.
- **Data lifecycle** - REMOVE records from TTL/session cleanup can remove derived cache/search/projection state.
- **AWS integrations** - common consumers: Lambda, EventBridge Pipes, SQS DLQ, SNS/EventBridge publishers, OpenSearch indexers, S3 audit archive.
- **Monitoring** - alarm on iterator age, errors, throttles, DLQ depth, partial batch failures, and downstream write failures.
- **Cost optimization** - tune batch size/window, filter early, keep handlers fast, and avoid unnecessary downstream writes.
- **Backup/DR** - streams are short retention CDC, not backup; use PITR/AWS Backup/S3 exports for recovery.
- **Compliance** - avoid PII in keys/logs, encrypt downstream sinks, retain audit projections per policy.

## Runbook

1. Start Floci: `docker compose up -d`.
2. Check health: `pnpm run floci:health` from repo root.
3. Provision stream-enabled table: `pnpm setup`.
4. Seed table changes: `pnpm seed`.
5. Run tests: `pnpm test`.
6. Run examples: `pnpm exec tsx src/examples/<file>.ts`.
7. Cleanup table: `pnpm cleanup`.

## Testing guidance

- Cover stream discovery, shard listing, iterator creation, reads, summaries, JSON conversion, filters, idempotency keys, audit events, lag, cost, and SDK error wrapping.
- Unit-test processors with fixture INSERT/MODIFY/REMOVE records.
- Production apps should test duplicate records, partial failures, poison records, DLQ redrive, and replay safety.

## Production checklist

- [ ] Stream view type chosen intentionally (`NEW_IMAGE`, `OLD_IMAGE`, or `NEW_AND_OLD_IMAGES`).
- [ ] Consumer idempotency key stored or side effects made naturally idempotent.
- [ ] Lambda event source mapping has batch size/window, retry, partial batch failure, max record age, and DLQ/on-failure destination.
- [ ] Iterator age and error alarms configured.
- [ ] Downstream writes include trace/tenant context.
- [ ] Backups/PITR configured separately; streams not used as disaster recovery storage.
- [ ] IAM scoped to stream ARN and downstream sinks.

## Gotchas

- Streams are ordered per shard, not globally.
- Records can be retried; duplicate delivery is normal.
- Stream retention is short in real AWS.
- Manual polling needs checkpointing; Lambda event source mapping handles this in production.
- Large images increase payload size and downstream processing cost.

## Floci vs Real AWS

Floci support: **full** for this lab. On real AWS, verify Lambda event source behavior, partial batch failures, iterator expiry, shard throughput, 24-hour retention, IAM per stream ARN, DLQ/on-failure destinations, CloudWatch iterator age, and downstream service costs.
