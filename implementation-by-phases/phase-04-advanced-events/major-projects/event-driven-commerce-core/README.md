# Event-Driven Commerce Core

Hands-on enterprise commerce backend where every state change emits auditable domain event.

## Scenarios

1. **Marketplace order lifecycle** - EventBridge choreography for fulfillment, notification, billing, analytics.
2. **Checkout saga** - Step Functions retries and compensates inventory/payment failures.
3. **Streaming analytics** - Kinesis clickstream, Firehose S3 event lake, hot-shard/capacity planning.
4. **Regulated fintech controls** - tenant-scoped access, audit logs, retry policy, compliance tags, lifecycle, DR.

## Run

```bash
pnpm --filter @floci-lab/phase-04 commerce:demo
pnpm --filter @floci-lab/phase-04 commerce:enterprise
pnpm --filter @floci-lab/phase-04 commerce:fintech
pnpm --filter @floci-lab/phase-04 commerce:analytics
```

Read main `../../README.md` for function map and production checklist.
