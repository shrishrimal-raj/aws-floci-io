# Phase 02 - Real Backend Patterns

Reliable Webhook Hub teaches production backend patterns that sit between API code and real customer integrations.

## What you learn

- **Idempotency**: DynamoDB TTL records prevent duplicate side effects and cache completed/failed responses.
- **Retries**: capped exponential backoff with jitter, retryable HTTP classification, poison-message detection, and next retry timestamps.
- **Webhook security**: HMAC signatures, constant-time verification, tenant endpoint access checks, and redacted audit logs.
- **Reliable delivery**: signed HTTP delivery, SQS delayed replay, DLQ classification, and failure notification payloads.
- **Rate limits**: token-bucket throttling with `Retry-After` guidance for noisy tenants.
- **Email alerts**: SES v1/v2 transactional mailers plus webhook failure email template.
- **Operations**: audit events, CloudWatch-safe metric dimensions, lifecycle decisions for hot/archive/delete audit data.

## Run

```bash
pnpm install
pnpm --filter @floci-lab/phase-02 typecheck
pnpm --filter @floci-lab/phase-02 test
pnpm --filter @floci-lab/phase-02 webhook:demo
pnpm --filter @floci-lab/phase-02 webhook:enterprise
```

## Key files

- `src/idempotency.ts` - start/get/complete/fail idempotent operations with DynamoDB TTL.
- `src/retry.ts` - backoff, retry rules, poison-message and next-retry helpers.
- `src/webhook.ts` - HMAC signing, verification, delivery classification, SQS replay queue.
- `src/rate-limit.ts` - token bucket creation, consumption, and retry-after calculation.
- `src/email.ts` - SES v1/v2 mailers and failure email builder.
- `src/enterprise-patterns.ts` - access checks, audit events, redaction, metrics, retention decisions.
- `src/examples/` - focused real-world examples for ingestion, delivery, and compliance lifecycle.
- `major-projects/reliable-webhook-hub/` - end-to-end enterprise webhook platform scenario.

## Architecture

1. API receives event and checks tenant endpoint policy.
2. Idempotency key prevents duplicate processing.
3. Token bucket rejects bursts with 429-style retry guidance.
4. Worker signs payload and posts webhook.
5. Retryable failures go to SQS replay with delay; exhausted messages go to DLQ.
6. Failed/DLQ deliveries create SES notification payloads.
7. Audit and metric records are redacted before logging.
8. Lifecycle job keeps recent audit records hot, archives older records, and deletes expired records.

## Floci notes

Use DynamoDB for idempotency records, SQS for replay/DLQ flow, and SES/SESv2 for notification labs. Examples run locally without live AWS calls unless you wire real clients.
