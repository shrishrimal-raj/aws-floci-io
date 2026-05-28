# Phase 02 - Real Backend Patterns implementation

Reliable delivery patterns used by production backends.

## Included

- Idempotency store backed by DynamoDB TTL records.
- Exponential backoff with jitter and poison-message detection.
- HMAC-signed webhook delivery with retry/DLQ classification.
- SQS replay queue wrapper.
- SES v1 and SES v2 transactional mailers.
- Token-bucket per-tenant rate limiter.
- Reliable Webhook Hub demo project.

## Run

```bash
pnpm install
pnpm --filter @floci-lab/phase-02 test
pnpm --filter @floci-lab/phase-02 webhook:demo
```

## Production notes

Exactly-once side effects are modeled as at-least-once delivery + idempotency key. Retry only transient responses (`408`, `429`, `5xx`). Permanent `4xx` fails fast. Poison messages move to DLQ after policy attempts and can be replayed by admin tooling.
