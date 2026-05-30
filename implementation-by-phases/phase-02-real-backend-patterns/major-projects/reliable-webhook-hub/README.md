# Reliable Webhook Hub

Enterprise-grade webhook delivery learning project for Phase 02.

## Scenarios

- Tenant endpoint authorization and event allow-listing.
- Idempotent event ingestion with DynamoDB TTL-ready records.
- Per-tenant token-bucket rate limits.
- HMAC-signed webhook delivery and constant-time verification.
- Retry, delayed SQS replay, DLQ classification, and failure email payloads.
- Audit logging, metric dimensions, redaction, and retention lifecycle planning.

## Run

```bash
pnpm --filter @floci-lab/phase-02 webhook:demo
pnpm --filter @floci-lab/phase-02 webhook:enterprise
```

`webhook:demo` prints small signing/backoff examples. `webhook:enterprise` runs the full local SaaS webhook platform flow.

## Learn by file

- `src/demo.ts` - quick HMAC and retry backoff tour.
- `src/scenarios/enterprise-webhook-platform.ts` - secure ingestion, reliable delivery, audit/metrics, lifecycle example.
- `../../src/examples/` - focused reusable examples for enterprise implementation patterns.

Full Floci e2e can wire DynamoDB idempotency table, SQS replay/DLQ queues, and SES verified identities.
