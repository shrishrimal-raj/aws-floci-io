# 005 - DynamoDB Streams

> Change data capture from DynamoDB tables with stream discovery, shard iterators, record reads, and Lambda-style record summaries.

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
- `src/use-cases/streams.ts` - list streams, find latest stream ARN, describe shards, read shard records, summarize stream records.
- `src/examples/read-stream.ts` - reads records from latest stream for `DDB_STREAMS_TABLE`.
- `src/examples/list-shards.ts` - lists shard IDs for latest table stream.
- `src/examples/summarize-record.ts` - converts raw stream record into handler-friendly summary.
- `scripts/setup.ts` - creates stream-enabled DynamoDB source table.
- `scripts/seed.ts` - writes fixture changes that produce stream records.
- `scripts/cleanup.ts` - deletes source table.

## Operations covered

| Operation | Function | Notes |
|---|---|---|
| List streams | `listTableStreams` | Optional table filter. |
| Latest stream ARN | `latestStreamArn` | Convenience lookup for current stream-enabled table. |
| Describe stream | `describeStream` | Reads view type, key schema, shards, status. |
| List shards | `shardIds` | Extracts shard IDs for iterator creation. |
| Get iterator | `getShardIterator` | Supports `TRIM_HORIZON` and `LATEST`. |
| Read shard | `readShardRecords` | Reads one batch from one shard and returns next iterator. |
| Read stream | `readRecords` | Reads one batch from every shard. |
| Summarize record | `summarizeRecord` | Extracts event name, keys, images, sequence number, timestamp. |
| Summarize batch | `summarizeRecords` | Maps stream batch to handler/log-friendly summaries. |

## Use cases

```ts
import { latestStreamArn, readRecords, summarizeRecords } from "./src/index.js";

const streamArn = await latestStreamArn("orders");
if (streamArn) {
  const records = await readRecords(streamArn, 100);
  console.log(summarizeRecords(records));
}
```

## Runbook

1. Start Floci: `docker compose up -d`.
2. Check health: `pnpm run floci:health` from repo root.
3. Provision stream-enabled source table: `pnpm setup`.
4. Seed table changes: `pnpm seed`.
5. Run tests: `pnpm test`.
6. Cleanup table: `pnpm cleanup`.

## Gotchas

- Streams are ordered per shard, not globally across all shards.
- Consumers must be idempotent; retries can deliver same record more than once.
- Iterator reads are short-lived. Long-running consumers need checkpointing.
- `NEW_AND_OLD_IMAGES` gives easiest audit/replication data but larger records.
- Lambda event source mappings handle polling/checkpointing in real AWS; manual polling is lab/debug pattern.
- Monitor iterator age in production to detect lagging consumers.

## Floci vs Real AWS

Floci support: **full** for this lab. On real AWS, usually consume streams through Lambda event source mappings with batch size, retry, bisect-on-error, DLQ/on-failure destination, and maximum record age configured. Real AWS has shard throughput limits, 24-hour stream retention, iterator expiry, Lambda partial batch failure behavior, IAM per stream ARN, and CloudWatch metrics such as iterator age that local Floci does not fully model.
