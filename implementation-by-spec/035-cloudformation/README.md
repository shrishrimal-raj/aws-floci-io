# 035 - CloudFormation

> Infrastructure as code with stacks, updates, change sets, describe/delete operations, and sample templates.

## Quick start

```bash
docker compose up -d
pnpm install
cd implementation-by-spec/035-cloudformation
pnpm setup
pnpm seed
pnpm test
pnpm cleanup
```

## Module

- `src/client.ts` - CloudFormation SDK v3 client for Floci (`http://localhost:4566`).
- `src/use-cases/stacks.ts - create/update/describe/delete stacks, change sets, and S3 bucket template helper.`
- `src/examples/*` - baseline plus focused runnable examples.
- `scripts/setup.ts` - provisions lab resources.
- `scripts/seed.ts` - loads or publishes fixture data.
- `scripts/cleanup.ts` - tears down lab resources.

## Operations covered

| Operation | Function | Notes |
|---|---|---|
| Provision resource | service create helper | Creates local service resource/config. |
| Describe/get | service read helper | Verifies resource state. |
| Template/metadata | pure helper | Builds SQL, templates, locations, or schemas. |
| Update/change | update helper | Changes managed resource where supported. |
| Cleanup | delete helper | Idempotent teardown where supported. |

## Use cases

```ts
import { /* helpers */ } from "./src/index.js";

const template = s3BucketTemplate("app-bucket");
```

## Runbook

1. Start Floci: `docker compose up -d`.
2. Check health: `pnpm run floci:health` from repo root.
3. Provision lab resources: `pnpm setup`.
4. Seed fixtures: `pnpm seed`.
5. Run tests: `pnpm test`.
6. Cleanup resources: `pnpm cleanup`.

## Gotchas

- Use change sets, drift detection, rollback alarms, nested stacks, stack policies.
- Use least-privilege IAM and private networking where applicable.
- Add logs, metrics, alarms, and retry/backoff around production operations.
- Clean up dependent resources in correct order.
- Budget for service-specific storage, request, and data processing costs.
- Local emulator behavior can differ from AWS quotas and async state transitions.

## Floci vs Real AWS

Floci support: **partial/wire-level** for this lab depending on service. On real AWS, configure production IAM, encryption, backups or retention, observability, quotas, and cost controls. Real AWS also has regional quotas, eventual consistency, service-specific pricing, and operational failure modes that local Floci does not fully model.
