# Phase 04 - Advanced Serverless & Event Systems

Enterprise event-driven commerce examples with EventBridge, Step Functions, Scheduler, Pipes, DynamoDB Streams, Kinesis, and Firehose.

## What you learn

- Model versioned domain events and publish them to EventBridge.
- Choose choreography (EventBridge) vs orchestration (Step Functions saga).
- Ingest clickstream/CDC data with Kinesis, Firehose, and DynamoDB Streams.
- Use Scheduler and Pipes to remove cron servers and glue Lambdas.
- Add secure access patterns, audit logging, retries, lifecycle, observability, cost, backup, and compliance controls.

## Function map

| Area | Main functions/classes | Practical use case |
| --- | --- | --- |
| Domain events | `createDomainEvent`, `eventPatternForTypes`, `CommerceEventBus.publish` | Order service emits `OrderPlaced`; billing, email, and analytics subscribe. |
| Workflows | `checkoutStateMachineDefinition`, `countStates`, `CheckoutWorkflow.start` | Checkout saga retries payment and compensates inventory on failure. |
| Scheduler/Pipes | `CommerceScheduler.createDaily`, `sqsToStepFunctionsPipePlan`, `CommercePipeProvisioner.create` | Nightly retention job; SQS spikes routed to Step Functions without Lambda. |
| Streams | `partitionKeyForClick`, `detectHotPartition`, `ClickStream.put`, `FirehoseSink.put`, `mapDynamoStreamRecord`, `DynamoStreamReader.readOnce` | Clickstream analytics, raw S3 event lake, DynamoDB CDC fanout. |
| Enterprise patterns | `withEnterpriseRetry`, `buildAuditLogEntry`, `secureEventAccessPolicy`, `buildLifecyclePolicy`, `observabilityEnvelope`, `complianceTags`, `estimateKinesisShards`, `buildDisasterRecoveryPlan` | Production-grade security, audit, cost, monitoring, retention, and DR. |
| Use-case examples | `marketplaceOrderLifecycleExample`, `checkoutSagaExample`, `clickstreamAnalyticsExample`, `regulatedEventsGovernanceExample` | Ready-to-run learning scenarios in `src/enterprise-use-cases.ts`. |

## Real-world examples

- `major-projects/event-driven-commerce-core/src/demo.ts` - quick service tour.
- `major-projects/event-driven-commerce-core/src/enterprise-commerce-demo.ts` - full commerce event architecture.
- `major-projects/event-driven-commerce-core/src/regulated-fintech-demo.ts` - secure/audited/compliant event processing.
- `major-projects/event-driven-commerce-core/src/streaming-analytics-demo.ts` - Kinesis/Firehose capacity and hot-partition planning.

## Run

```bash
pnpm install
pnpm --filter @floci-lab/phase-04 test
pnpm --filter @floci-lab/phase-04 typecheck
pnpm --filter @floci-lab/phase-04 commerce:demo
pnpm --filter @floci-lab/phase-04 commerce:enterprise
pnpm --filter @floci-lab/phase-04 commerce:fintech
pnpm --filter @floci-lab/phase-04 commerce:analytics
```

## Production checklist

- Use tenant-scoped IAM and event-source allowlists before accepting publisher traffic.
- Log audit records for publish, consume, replay, DLQ redrive, and denied access.
- Use retries only for transient failures; send poison messages to DLQ quickly.
- Configure EventBridge archive/replay, S3 lifecycle, CloudWatch retention, and backup vaults.
- Emit correlation IDs, tenant dimensions, latency/count/error metrics, and hot-shard alarms.
- Estimate Kinesis shards before launch; prefer Firehose compression/batching to reduce S3 cost.
- Version event schemas and keep consumers backward compatible during rollout.
