# 031 - MSK Kafka

> Managed Kafka provisioned/serverless patterns with cluster lifecycle and bootstrap broker helpers.

## Quick start

```bash
docker compose up -d
pnpm install
cd implementation-by-spec/031-msk-kafka
pnpm setup
pnpm seed
pnpm test
pnpm cleanup
```

## Module

- `src/client.ts` - MSK Kafka SDK v3 client for Floci (`http://localhost:4566`).
- `src/use-cases/clusters.ts - create/describe/list/delete MSK clusters and build bootstrap strings.`
- `src/examples/*` - baseline plus focused runnable examples.
- `scripts/setup.ts` - provisions lab resources.
- `scripts/seed.ts` - loads or publishes fixture data.
- `scripts/cleanup.ts` - tears down lab resources.

## Operations covered

| Operation | Function | Notes |
|---|---|---|
| Provision resource | service create helper | Creates local service resource/config. |
| Describe/list | service read helper | Verifies resource state. |
| Data/query action | service runtime helper | Exercises main runtime path. |
| Cleanup | delete helper | Idempotent teardown where supported. |
| Pure helpers | helper functions | Build mappings, SQL, bootstrap URLs, or config values. |

## Use cases

```ts
import { /* helpers */ } from "./src/index.js";

const brokers = kafkaBootstrapUrl(["b1:9092", "b2:9092"]);
```

## Runbook

1. Start Floci: `docker compose up -d`.
2. Check health: `pnpm run floci:health` from repo root.
3. Provision lab resources: `pnpm setup`.
4. Seed fixtures: `pnpm seed`.
5. Run tests: `pnpm test`.
6. Cleanup resources: `pnpm cleanup`.

## Gotchas

- Plan subnet sizing, broker storage, auth/TLS, topic replication, consumer lag alarms.
- Use least-privilege IAM and private networking where applicable.
- Add logs, metrics, alarms, and retry/backoff around production operations.
- Clean up dependent resources in correct order.
- Budget for service-specific hourly, storage, request, and data transfer costs.
- Local emulator behavior can differ from AWS quotas, async state transitions, and networking.

## Floci vs Real AWS

Floci support: **partial/wire-level** for this lab depending on service. On real AWS, configure production IAM, networking, encryption, backups or retention, observability, quotas, and cost controls. Real AWS also has regional quotas, eventual consistency, service-specific pricing, and operational failure modes that local Floci does not fully model.
