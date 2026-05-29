# 004 - DynamoDB

> Serverless NoSQL key-value/document store with single-table design, composite keys, GSI access patterns, conditional writes, paginated queries, and streams.

## Quick start

```bash
docker compose up -d
pnpm install
cd implementation-by-spec/004-dynamodb
pnpm setup
pnpm seed
pnpm test
pnpm cleanup
```

## Module

- `src/client.ts` - DynamoDB SDK v3 client for Floci (`http://localhost:4566`).
- `src/use-cases/table.ts` - single-table creation, raw item CRUD, JSON entity helpers, conditional writes, PK/GSI queries, pagination, scan, cleanup.
- `src/examples/basic-table.ts` - raw item put/get/query example.
- `src/examples/json-entity.ts` - typed JSON entity stored in single-table shape.
- `src/examples/paginated-query.ts` - paginated query with `LastEvaluatedKey` cursor.
- `scripts/setup.ts` - creates `floci-ddb-lab` with `pk/sk`, `gsi1`, and streams enabled.
- `scripts/seed.ts` - writes fixture user/order data.
- `scripts/cleanup.ts` - deletes lab table.

## Operations covered

| Operation | Function | Notes |
|---|---|---|
| Create table | `createSingleTable` | PAY_PER_REQUEST table with `pk/sk`, `gsi1pk/gsi1sk`, stream enabled. |
| Describe table | `describeTable` | Reads status, indexes, stream metadata. |
| Put raw item | `putItem` | Direct DynamoDB `AttributeValue` item write. |
| Conditional put | `putItemIfAbsent` | Uses `attribute_not_exists(pk/sk)` for idempotent creates. |
| Put JSON entity | `putJsonEntity` | Converts JSON fields to DynamoDB attributes and adds entity metadata. |
| Get raw item | `getItem` | Strong key lookup by `pk` + `sk`. |
| Get JSON entity | `getJsonEntity` | Converts DynamoDB attributes back to typed JSON fields. |
| Patch attributes | `updateJsonPatch` | Uses update expression for string field updates. |
| Query partition | `queryByPk` | Main table access pattern for one aggregate/entity collection. |
| Query page | `queryByPkPage` | Cursor-based reads with `LastEvaluatedKey`. |
| Query GSI | `queryGsi` | Alternate lookup via `gsi1`. |
| Scan | `scanAll` | Lab/admin only; avoid in production request paths. |
| Delete item/table | `deleteItem`, `deleteTable` | Idempotent cleanup for lab resources. |

## Use cases

```ts
import { createSingleTable, putJsonEntity, getJsonEntity, queryGsi, deleteTable } from "./src/index.js";

await createSingleTable("app");
await putJsonEntity({
  pk: "USER#1",
  sk: "PROFILE",
  entityType: "UserProfile",
  value: { name: "Ada", loginCount: 1, active: true },
  gsi1pk: "EMAIL#ada@example.com",
  gsi1sk: "USER#1",
}, "app");

console.log(await getJsonEntity("USER#1", "PROFILE", "app"));
console.log(await queryGsi("EMAIL#ada@example.com", "app"));
await deleteTable("app");
```

## Runbook

1. Start Floci: `docker compose up -d`.
2. Check health: `pnpm run floci:health` from repo root.
3. Provision table: `pnpm setup`.
4. Seed fixtures: `pnpm seed`.
5. Run tests: `pnpm test`.
6. Cleanup table: `pnpm cleanup`.

## Gotchas

- Design access patterns before schema. DynamoDB does not support arbitrary relational queries.
- Avoid scans in production request paths; scans consume capacity and get slower with table size.
- Hot partition keys throttle even on on-demand tables. Spread high-volume writes across keys.
- Conditional writes are required for safe idempotency and uniqueness constraints.
- Queries and scans are paginated. Always handle `LastEvaluatedKey` for large result sets.
- GSI reads are eventually consistent on real AWS and have separate throughput/cost behavior.
- Large items increase read/write cost. Keep items under 400 KB and store blobs in S3.

## Floci vs Real AWS

Floci support: **full** for this lab. On real AWS, enable point-in-time recovery, alarms for throttles/system errors, TTL where useful, KMS encryption requirements, backups, Contributor Insights for hot keys, and least-privilege IAM per table/index ARN. Real AWS also has capacity modes, adaptive capacity, GSI backfill timing, stream shard processing, transaction APIs, global tables, and per-request pricing that local Floci does not model.
