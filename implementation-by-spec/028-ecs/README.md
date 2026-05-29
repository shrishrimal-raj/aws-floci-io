# 028 - ECS

> Container orchestration for Fargate/EC2 with clusters, task definitions, task runs, and cleanup.

## Quick start

```bash
docker compose up -d
pnpm install
cd implementation-by-spec/028-ecs
pnpm setup
pnpm seed
pnpm test
pnpm cleanup
```

## Module

- `src/client.ts` - ECS SDK v3 client for Floci (`http://localhost:4566`).
- `src/use-cases/services.ts - create clusters, register Fargate task definitions, run tasks, deregister/delete.`
- `src/examples/*` - baseline plus focused runnable examples.
- `scripts/setup.ts` - provisions lab resources.
- `scripts/seed.ts` - loads or publishes fixture data.
- `scripts/cleanup.ts` - tears down lab resources.

## Operations covered

| Operation | Function | Notes |
|---|---|---|
| Provision resource | service create helper | Creates local service resource/config. |
| Describe/list | service read helper | Verifies resource state. |
| Data-plane action | service write/run helper | Exercises main runtime path. |
| Cleanup | delete helper | Idempotent teardown where supported. |
| Pure helpers | helper functions | Build URLs, keys, payloads, ARNs, or encoded values. |

## Use cases

```ts
import { /* helpers */ } from "./src/index.js";

await registerFargateTask("orders", "123.dkr.ecr.us-east-1.amazonaws.com/orders:latest");
```

## Runbook

1. Start Floci: `docker compose up -d`.
2. Check health: `pnpm run floci:health` from repo root.
3. Provision lab resources: `pnpm setup`.
4. Seed fixtures: `pnpm seed`.
5. Run tests: `pnpm test`.
6. Cleanup resources: `pnpm cleanup`.

## Gotchas

- Configure VPC networking, IAM roles, logs, autoscaling, deployments, health checks.
- Use least-privilege IAM and private networking where applicable.
- Add logs, metrics, alarms, and retry/backoff around production operations.
- Clean up dependent resources in correct order.
- Budget for service-specific hourly, storage, request, and data transfer costs.
- Local emulator behavior can differ from AWS quotas, async state transitions, and networking.

## Floci vs Real AWS

Floci support: **partial/wire-level** for this lab depending on service. On real AWS, configure production IAM, networking, encryption, backups or retention, observability, quotas, and cost controls. Real AWS also has regional quotas, eventual consistency, service-specific pricing, and operational failure modes that local Floci does not fully model.
