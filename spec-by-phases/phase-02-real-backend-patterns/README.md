# Phase 02 - Real Backend Patterns

> **Theme**: REST, async, retries, DLQs, idempotency, uploads, schedules, email
> **Difficulty**: 3/5
> **Estimated time**: 3 weeks

## Learning goals
- Implement idempotency keys backed by DynamoDB
- Design retry + DLQ strategies for SQS and Lambda
- Build resumable multipart S3 uploads
- Send transactional email with SES
- Schedule recurring jobs with EventBridge Scheduler

## Services covered
- [021 - SES](../../spec-by-services/021-ses/README.md)
- [022 - SES v2](../../spec-by-services/022-ses-v2/README.md)

## Concepts to master
- At-least-once vs exactly-once semantics
- Idempotency key TTL strategies
- Exponential backoff with jitter
- Poison message detection and quarantine
- Outbox pattern over DynamoDB Streams

## Mini-projects
- Idempotent payment intent creation
- Reliable webhook dispatcher with DLQ + replay UI
- Daily report scheduler

## Major real-world project
**Reliable Webhook Hub** - A B2B webhook delivery service with HMAC signing, exponential retry, DLQ + replay, per-tenant rate limits, and an admin dashboard. Equivalent to Stripe's webhook layer scaled down.

Lives in: `implementation-by-phases/phase-02-real-backend-patterns/major-projects/reliable-webhook-hub/`

## Folder structure
```
implementation-by-phases/phase-02-real-backend-patterns/
├── README.md
├── package.json
├── src/
├── tests/
└── major-projects/
    └── reliable-webhook-hub/
```

## Codex CLI prompt
See `prompts/phases/phase-02.md`.

## Acceptance criteria
- All service folders for this phase have green tests.
- The major project runs end-to-end against Floci.
- Documentation is complete.

## Tests to run
```bash
docker compose up -d
cd implementation-by-spec/021-ses && pnpm test && cd -
cd implementation-by-spec/022-ses-v2 && pnpm test && cd -
cd implementation-by-phases/phase-02-real-backend-patterns && pnpm test
```

## Common bugs to debug
- Idempotency keys without TTL → table bloat
- Retrying non-idempotent operations → duplicate side effects
- SES sandbox mode rejecting unverified recipients

## What a real production version would add
Production adds circuit breakers, per-destination concurrency limits, replay observability, and PII scrubbing in logs.

## Recommended order
Complete services in the order listed under 'Services covered' before tackling the major project.
