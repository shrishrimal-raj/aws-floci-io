# 018 - Step Functions

> Workflow orchestration with ASL definitions, executions, and cleanup.

## Quick start

```bash
docker compose up -d
pnpm install
cd implementation-by-spec/018-step-functions
pnpm setup
pnpm seed
pnpm test
pnpm cleanup
```

## Module

- `src/client.ts` - Step Functions SDK v3 client for Floci (`http://localhost:4566`).
- `src/use-cases/workflows.ts - ASL helper, state machine create/start/describe/delete.`
- `src/examples/*` - baseline plus focused runnable examples.
- `scripts/setup.ts` - provisions lab resources.
- `scripts/seed.ts` - loads or publishes fixture data.
- `scripts/cleanup.ts` - tears down lab resources.

## Operations covered

| Operation | Function | Notes |
|---|---|---|
| Primary create/config | service helper | Provisions local resource or config. |
| Publish/send/write | service helper | Exercises main data-plane path. |
| Read/describe/filter | service helper | Verifies state or output. |
| Cleanup | delete helper | Idempotent teardown. |
| Pure helpers | helper functions | Build payloads, filters, templates, or encoded records. |

## Use cases

```ts
import { /* helpers */ } from "./src/index.js";

const arn = await createStateMachine("orders", passStateMachine({ ok: true }));
```

## Runbook

1. Start Floci: `docker compose up -d`.
2. Check health: `pnpm run floci:health` from repo root.
3. Provision lab resources: `pnpm setup`.
4. Seed fixtures: `pnpm seed`.
5. Run tests: `pnpm test`.
6. Cleanup resources: `pnpm cleanup`.

## Gotchas

- Model retries/catches, idempotency, execution history, logging, X-Ray, quotas.
- Keep handlers idempotent and retry-safe.
- Use least-privilege IAM for source, target, and management APIs.
- Add metrics/alarms for failures, throttling, and delivery lag.
- Clean up dependent resources in correct order.
- Local emulator behavior can differ from service quotas and async delivery in AWS.

## Floci vs Real AWS

Floci support: **partial** for this lab. On real AWS, configure production IAM, retries, DLQs or failure destinations where supported, audit logs, alarms, quotas, and cost controls. Real AWS also has regional quotas, IAM policy evaluation, retry semantics, service-specific pricing, and operational metrics that local Floci does not fully model.
