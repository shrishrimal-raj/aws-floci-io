# Event-Driven Commerce Core

Commerce backend where every state change emits domain event.

## Capabilities

- EventBridge custom bus for commerce events.
- Checkout saga orchestrated by Step Functions.
- Kinesis clickstream with tenant/session partition keys.
- Firehose sink for raw event lake in S3.
- DynamoDB Streams mapper for CDC fanout.
- Scheduler for recurring reports/jobs.
- Pipes plan for SQS → Step Functions without glue Lambda.

## Demo

```bash
pnpm --filter @floci-lab/phase-04 commerce:demo
```
