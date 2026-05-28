# Project 006 - Data Ingestion & Analytics Platform

## Business scenario
Ingest 10k events/sec, land in S3 as Parquet, queryable in Athena within 5 minutes.

## AWS services used
- Kinesis
- Firehose
- S3
- Glue
- Athena

## Architecture
- Producer → Kinesis Data Streams (n shards)
- Firehose with Parquet conversion + dynamic partitioning by event_date
- Glue catalog auto-updated
- Athena workgroup with cost guardrails

## API design
TBD - designed in the implementation phase.

## Data model
Bronze (raw JSON) → Silver (Parquet partitioned) → Gold (aggregates)

## Event flow
Producer → Kinesis → Firehose → S3 → Glue crawler → Athena

## Error handling strategy
Firehose error output prefix → manual reprocessing job

## Testing strategy
Load test with k6; verify partition layout

## Security model
S3 bucket encryption, Lake Formation row-level filters

## Observability model
IncomingRecords, DeliveryToS3.Success metrics

## Local Floci setup
```bash
docker compose up -d
cd implementation-by-phases/phase-10-capstone/projects/006-data-pipeline-platform
pnpm install
pnpm setup
pnpm dev
```

## Codex CLI prompt
See `prompts/projects/006-data-pipeline-platform.md`.

## Acceptance criteria
- End-to-end happy path works against Floci.
- Tests cover >=80% of business logic.
- Security model enforced (auth + IAM + encryption where applicable).
- Observability: logs + metrics + at least one alarm.
- Documentation includes runbook + architecture diagram.
