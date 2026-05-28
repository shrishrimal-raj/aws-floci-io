# 005 - DynamoDB Streams

Change data capture from DynamoDB tables. Feeds Lambda/event processors.

## Quick start
```bash
pnpm setup
pnpm seed
pnpm test
pnpm cleanup
```

## Module
`src/use-cases/streams.ts` lists streams, finds latest stream ARN, describes shards, reads records, and summarizes records for handlers.

## Runbook
Enable stream on source table, deploy consumer, process records idempotently, checkpoint/retry failures, alarm on iterator age. Floci support: full for lab; real AWS needs Lambda event source mapping and DLQ/on-failure config.
