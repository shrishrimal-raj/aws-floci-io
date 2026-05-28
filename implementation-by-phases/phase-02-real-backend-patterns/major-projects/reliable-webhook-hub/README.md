# Reliable Webhook Hub

B2B webhook delivery layer inspired by Stripe-style webhook infrastructure.

## Capabilities

- Per-delivery HMAC signature: `t=<timestamp>,v1=<sha256>`.
- Retry decision based on HTTP status.
- Exponential backoff with jitter.
- Poison-message detection and DLQ/replay queue path.
- Tenant rate limiting by token bucket.
- SES mailers for transactional admin/customer notifications.

## Demo

```bash
pnpm --filter @floci-lab/phase-02 webhook:demo
```
