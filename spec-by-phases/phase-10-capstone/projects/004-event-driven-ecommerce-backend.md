# Project 004 - Event-Driven Ecommerce Backend

## Business scenario
An ecommerce platform with checkout saga, abandoned-cart recovery, and email lifecycle.

## AWS services used
- EventBridge
- Step Functions
- SQS
- DynamoDB
- SES

## Architecture
- Every write emits an event to EventBridge custom bus
- Step Functions orchestrates checkout (reserve → charge → fulfill → notify)
- Scheduler triggers abandoned-cart recovery at T+1h, T+24h

## API design
TBD - designed in the implementation phase.

## Data model
Events archived to S3 via Firehose; Orders single-table in DDB

## Event flow
CartUpdated → CheckoutStarted → PaymentAuthorized → OrderConfirmed → ShipmentCreated

## Error handling strategy
Step Functions Catch states route to compensating transactions

## Testing strategy
ASL local + Floci; verify each compensation path

## Security model
Per-domain event buses, schema registry, IAM event-resource policies

## Observability model
Step Functions execution metrics, EventBridge target failure metric

## Local Floci setup
```bash
docker compose up -d
cd implementation-by-phases/phase-10-capstone/projects/004-event-driven-ecommerce-backend
pnpm install
pnpm setup
pnpm dev
```

## Codex CLI prompt
See `prompts/projects/004-event-driven-ecommerce-backend.md`.

## Acceptance criteria
- End-to-end happy path works against Floci.
- Tests cover >=80% of business logic.
- Security model enforced (auth + IAM + encryption where applicable).
- Observability: logs + metrics + at least one alarm.
- Documentation includes runbook + architecture diagram.
