# Project 002 - Queue-Based Order Processing System

## Business scenario
An e-commerce backend needs to accept order placements and process them asynchronously (inventory check, payment, fulfillment).

## AWS services used
- SQS
- SNS
- Lambda
- DynamoDB

## Architecture
- POST /orders → DDB (status=pending) → SNS topic
- SNS fans out to SQS (inventory), SQS (payment), SQS (notifications)
- Each Lambda worker consumes its queue, retries with backoff, DLQ on failure

## API design
TBD - designed in the implementation phase.

## Data model
Orders: PK=ORDER#{id}, SK=METADATA. OrderItems: PK=ORDER#{id}, SK=ITEM#{sku}

## Event flow
OrderPlaced → InventoryReserved → PaymentCharged → OrderConfirmed → EmailSent

## Error handling strategy
Visibility timeout = 6× expected processing; redrive policy maxReceiveCount=3

## Testing strategy
Integration test full flow on Floci; chaos test: kill worker mid-process

## Security model
Each Lambda has its own role; SQS encryption with KMS

## Observability model
Per-stage latency metric, DLQ depth alarm

## Local Floci setup
```bash
docker compose up -d
cd implementation-by-phases/phase-10-capstone/projects/002-queue-based-order-system
pnpm install
pnpm setup
pnpm dev
```

## Codex CLI prompt
See `prompts/projects/002-queue-based-order-system.md`.

## Acceptance criteria
- End-to-end happy path works against Floci.
- Tests cover >=80% of business logic.
- Security model enforced (auth + IAM + encryption where applicable).
- Observability: logs + metrics + at least one alarm.
- Documentation includes runbook + architecture diagram.
