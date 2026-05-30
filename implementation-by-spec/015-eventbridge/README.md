# 015 - EventBridge

EventBridge learning module for custom buses, event patterns, rules, targets, typed publishing, durable delivery, and enterprise event operations.

## Quick start

```bash
pnpm install
pnpm --filter @floci-lab/eventbridge test
pnpm --filter @floci-lab/eventbridge setup
pnpm --filter @floci-lab/eventbridge seed
pnpm --filter @floci-lab/eventbridge cleanup
```

## Module

- `src/client.ts` - EventBridge SDK v3 client for Floci or AWS endpoint.
- `src/use-cases/events.ts` - create/delete bus, build patterns, create rules, attach targets with retry/DLQ, publish single/batch events, cleanup rules.
- `src/use-cases/enterprise.ts` - tenant access guard, standard event envelope, audit events, retry backoff, safe batching, durable targets, tenant filters, archive/replay plan, observability plan, cost estimate.
- `src/examples/basic-event.ts` - create bus, publish one event, cleanup.
- `src/examples/batch-events.ts` - publish multiple typed events.
- `src/examples/rule-target.ts` - create pattern and attach target.
- `src/examples/secure-saas-order-routing.ts` - secure multi-tenant order event flow with audit envelope.
- `src/examples/durable-target-dlq.ts` - target retry and DLQ delivery pattern.
- `src/examples/batch-invoice-publishing.ts` - PutEvents batching and cost estimate.
- `src/examples/compliance-archive-replay.ts` - audit, archive, and replay planning.
- `src/examples/observability-cost-dr.ts` - alarms, cost, and recovery runbook.

## Enterprise patterns

Use tenant-scoped events with `tenantId`, `eventId`, `schemaVersion`, `correlationId`, and `producer`. Route with explicit source/detail-type patterns, add DLQs and retry policy to targets, publish in batches of 10, log audit events, and plan archive/replay windows for recovery.

## Floci vs real AWS

Floci covers core EventBridge commands for local learning. Real AWS needs IAM permissions, resource policies, cross-account buses, target-specific roles, schema governance, archive/replay setup, CloudWatch alarms, DLQ monitoring, event size checks, and cost controls.

## Production checklist

- Secure access: tenant and role checks before publishing.
- Audit: publish immutable audit events for attempts, success, failure, denied actions.
- Reliability: retries with jitter, target DLQs, idempotent consumers, replay plan.
- Lifecycle: archive retention based on compliance and recovery needs.
- Observability: alarms for failed invocations, throttles, DLQ depth, failed PutEvents entries.
- Cost: batch events, filter early, avoid noisy rules, track monthly event volume.
