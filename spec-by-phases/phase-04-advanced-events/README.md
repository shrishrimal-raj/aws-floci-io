# Phase 04 - Advanced Serverless & Event Systems

> **Theme**: EventBridge, Pipes, Scheduler, Step Functions, Kinesis, Firehose, DDB Streams
> **Difficulty**: 4/5
> **Estimated time**: 3 weeks

## Learning goals
- Route domain events with EventBridge custom buses
- Orchestrate long-running workflows with Step Functions
- Stream events at scale with Kinesis Data Streams
- Fan out DynamoDB changes via Streams + Lambda
- Connect sources to targets with EventBridge Pipes (no Lambda glue)

## Services covered
- [005 - DynamoDB Streams](../../spec-by-services/005-dynamodb-streams/README.md)
- [015 - EventBridge](../../spec-by-services/015-eventbridge/README.md)
- [016 - EventBridge Scheduler](../../spec-by-services/016-eventbridge-scheduler/README.md)
- [017 - EventBridge Pipes](../../spec-by-services/017-eventbridge-pipes/README.md)
- [018 - Step Functions](../../spec-by-services/018-step-functions/README.md)
- [023 - Kinesis Data Streams](../../spec-by-services/023-kinesis/README.md)
- [024 - Firehose](../../spec-by-services/024-firehose/README.md)

## Concepts to master
- Choreography vs orchestration
- Standard vs Express Step Functions
- Kinesis shards, partition keys, enhanced fan-out
- ASL (Amazon States Language)
- Event replay and archive

## Mini-projects
- Order saga orchestrated by Step Functions
- Click-stream pipeline with Kinesis + Firehose → S3
- DDB Streams CDC into OpenSearch

## Major real-world project
**Event-Driven Commerce Core** - A commerce backend where every state change emits a domain event to EventBridge. Step Functions orchestrates checkout. Kinesis streams clickstream. Pipes connect SQS to Step Functions without glue Lambdas.

Lives in: `implementation-by-phases/phase-04-advanced-events/major-projects/event-driven-commerce-core/`

## Folder structure
```
implementation-by-phases/phase-04-advanced-events/
├── README.md
├── package.json
├── src/
├── tests/
└── major-projects/
    └── event-driven-commerce-core/
```

## Codex CLI prompt
See `prompts/phases/phase-04.md`.

## Acceptance criteria
- All service folders for this phase have green tests.
- The major project runs end-to-end against Floci.
- Documentation is complete.

## Tests to run
```bash
docker compose up -d
cd implementation-by-spec/005-dynamodb-streams && pnpm test && cd -
cd implementation-by-spec/015-eventbridge && pnpm test && cd -
cd implementation-by-spec/016-eventbridge-scheduler && pnpm test && cd -
cd implementation-by-spec/017-eventbridge-pipes && pnpm test && cd -
cd implementation-by-spec/018-step-functions && pnpm test && cd -
cd implementation-by-spec/023-kinesis && pnpm test && cd -
cd implementation-by-spec/024-firehose && pnpm test && cd -
cd implementation-by-phases/phase-04-advanced-events && pnpm test
```

## Common bugs to debug
- Step Function state explosion from bad retry config
- Kinesis hot shard from low-cardinality partition key
- EventBridge rule pattern mismatches

## What a real production version would add
Production adds schema registry, event versioning, replay tooling, and per-event-type SLOs.

## Recommended order
Complete services in the order listed under 'Services covered' before tackling the major project.
