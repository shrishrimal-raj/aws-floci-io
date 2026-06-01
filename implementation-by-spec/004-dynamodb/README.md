# 004 - DynamoDB

> Enterprise serverless NoSQL with single-table design, tenant-safe keys, conditional writes, GSI access patterns, pagination, audit records, retries, lifecycle cleanup, streams-ready tables, and cost modeling.

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
- `src/use-cases/table.ts` - single-table creation, raw/JSON CRUD, conditional writes, queries, GSI, pagination, audit, retries, cleanup, cost.
- `src/examples/basic-table.ts` - raw item put/get/query.
- `src/examples/json-entity.ts` - typed JSON entity in single-table shape.
- `src/examples/paginated-query.ts` - cursor-style query page.
- `src/examples/multi-tenant-saas.ts` - tenant-safe account item, conditional create, status GSI, retry update.
- `src/examples/audit-compliance-ledger.ts` - append-only compliance audit item.
- `src/examples/event-driven-outbox.ts` - outbox pattern for DynamoDB Streams + SNS/EventBridge.
- `src/examples/session-lifecycle-cleanup.ts` - explicit partition cleanup for sessions/offboarding.
- `src/examples/observability-cost-dr.ts` - describe/scan admin view, cost estimate, monitoring/DR notes.
- `src/examples/batch-operations.ts` - efficient batch reads/writes for bulk data processing.
- `scripts/setup.ts` - creates `floci-ddb-lab` with `pk/sk`, `gsi1`, and streams enabled.
- `scripts/seed.ts` - writes fixture user/order data.
- `scripts/cleanup.ts` - deletes lab table.

## Operations covered

| Operation       | Function                                                                 | Notes                                                      |
| --------------- | ------------------------------------------------------------------------ | ---------------------------------------------------------- |
| Table lifecycle | `createSingleTable`, `describeTable`, `deleteTable`                      | PAY_PER_REQUEST table, `pk/sk`, `gsi1`, streams enabled.   |
| Key helpers     | `entityKeys`, `statusIndexKeys`                                          | Tenant-scoped primary keys and status/time GSI keys.       |
| Raw CRUD        | `putItem`, `putItemIfAbsent`, `getItem`, `updateJsonPatch`, `deleteItem` | Direct `AttributeValue` access and conditional uniqueness. |
| JSON entities   | `putJsonEntity`, `putJsonEntityIfAbsent`, `getJsonEntity`                | Typed app objects converted to DynamoDB attributes.        |
| Retry update    | `updateJsonPatchWithRetry`                                               | Bounded retry for throttling/transient update failures.    |
| Queries         | `queryByPk`, `queryByPkPage`, `queryAllByPk`, `queryGsi`                 | Main and alternate access patterns with pagination.        |
| Batch I/O       | `batchGetItem`, `batchWriteItem`                                         | Bulk read/write patterns to reduce network round trips.    |
| Admin/lifecycle | `scanAll`, `deleteItemsByPk`                                             | Lab/admin scans and tenant/session cleanup jobs.           |
| Audit/cost      | `auditEntity`, `estimateDynamoDbCost`                                    | Compliance event item builder and simple cost estimate.    |

## Function examples

### Multi-tenant entity with GSI access pattern

```ts
const keys = entityKeys({
  tenantId: "acme",
  entityType: "ACCOUNT",
  entityId: "acct-1",
});
const gsi = statusIndexKeys(
  "acme",
  "ACCOUNT",
  "ACTIVE",
  new Date().toISOString(),
);
await putJsonEntityIfAbsent({
  ...keys,
  entityType: "Account",
  value: { tenantId: "acme", accountId: "acct-1", status: "ACTIVE" },
  ...gsi,
});
console.log(await queryGsi(gsi.gsi1pk));
```

### Audit record

```ts
await putJsonEntity(
  auditEntity({
    tenantId: "acme",
    actorId: "user-1",
    action: "OrderRead",
    resourceId: "order-1",
    outcome: "ALLOW",
  }),
);
```

### Retry update and paginated query

```ts
await updateJsonPatchWithRetry("TENANT#acme#ORDER#o1", "PROFILE", {
  status: "PAID",
});
const allItems = await queryAllByPk("TENANT#acme#ORDER#o1", 25);
```

## Real-world scenarios

- **Secure multi-user SaaS** - derive tenant ID from auth claims, include it in every `pk`, and enforce authorization before reads/writes.
- **Audit logging** - store immutable audit rows with actor, action, resource, outcome, trace ID; export via Streams/Firehose/S3 in production.
- **Error handling and retries** - use conditional writes for idempotency; retry throttling with backoff; never retry validation/conflict blindly.
- **Data lifecycle** - use native TTL in real AWS for expiry; use `deleteItemsByPk` for tenant offboarding, session cleanup, and tests.
- **Event-driven processing** - stream-enabled table supports outbox, projections, cache invalidation, search indexing, and EventBridge/SNS publishing.
- **AWS integrations** - common integrations: Lambda, DynamoDB Streams, SQS/SNS/EventBridge, KMS, CloudWatch, Backup, S3 exports.
- **Monitoring** - alarm on throttles, system errors, latency, stream iterator age, hot keys, and failed stream processors.
- **Cost optimization** - design exact queries, avoid scans, keep items small, choose on-demand/provisioned intentionally, watch GSI/storage costs.
- **Backup/DR** - enable PITR, scheduled backups, IaC recreation, restore drills, and global tables if multi-region RTO/RPO requires it.
- **Compliance** - least-privilege IAM per table/index, KMS encryption, audit trails, retention policy, and no sensitive data in keys.

## Runbook

1. Start Floci: `docker compose up -d`.
2. Check health: `pnpm run floci:health` from repo root.
3. Provision table: `pnpm setup`.
4. Seed fixtures: `pnpm seed`.
5. Run tests: `pnpm test`.
6. Run examples: `pnpm exec tsx src/examples/<file>.ts`.
7. Cleanup table: `pnpm cleanup`.

## Testing guidance

- Cover table creation, raw CRUD, JSON entities, conditional writes, updates, GSI queries, pagination, scans, delete, audit, key helpers, retries, and errors.
- Test duplicate creates and idempotency keys.
- Test hot access patterns with realistic tenant/entity keys.
- Production apps should add load tests, stream processor tests, backup/restore drills, and IAM denial tests.

## Production checklist

- [ ] Access patterns documented before schema changes.
- [ ] Tenant ID present in every primary access pattern.
- [ ] Conditional writes protect idempotency/uniqueness.
- [ ] Queries handle pagination.
- [ ] Scans avoided in request paths.
- [ ] PITR/backups enabled and restore tested.
- [ ] CloudWatch alarms for throttles, errors, latency, stream lag.
- [ ] KMS/IAM requirements reviewed.
- [ ] Item size kept below 400 KB; blobs stored in S3.
- [ ] TTL/lifecycle policy defined.

## Gotchas

- DynamoDB is access-pattern-first; it is not relational SQL.
- Hot partition keys throttle even on on-demand tables.
- GSI reads are eventually consistent on real AWS.
- `scanAll` is for tiny labs/admin jobs only.
- Large items and unnecessary GSIs increase cost.
- Do not put PII/secrets in keys, logs, or metrics.

## Floci vs Real AWS

Floci support: **full** for this lab. On real AWS, verify IAM, KMS, PITR, TTL, backups, adaptive capacity, GSI backfill, stream shard behavior, global tables, Contributor Insights, quotas, and per-request/storage costs.
