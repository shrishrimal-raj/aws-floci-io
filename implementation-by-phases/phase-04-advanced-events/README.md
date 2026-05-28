# Phase 04 - Advanced Serverless & Event Systems implementation

Event-driven commerce core using advanced AWS event services.

## Included

- EventBridge domain event model, custom bus publisher, rule patterns.
- Step Functions checkout saga ASL object with retry and compensation path.
- Kinesis clickstream writer and hot-partition detector.
- Firehose S3 sink writer.
- DynamoDB Streams change mapper and one-shot reader.
- EventBridge Scheduler daily schedule helper.
- EventBridge Pipes SQS → Step Functions plan/provisioner.

## Run

```bash
pnpm install
pnpm --filter @floci-lab/phase-04 test
pnpm --filter @floci-lab/phase-04 commerce:demo
```

## Production notes

Use choreography for independent state changes via EventBridge. Use orchestration when checkout needs ordered compensation. Kinesis partition keys include tenant + session to avoid hot shards. EventBridge rules should be tested against event samples to prevent pattern mismatches. Replay/archive and schema versioning belong in production rollout.
