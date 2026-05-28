# 004 - DynamoDB

Serverless NoSQL key-value/document store. Single-table design lab.

## Quick start
```bash
pnpm setup
pnpm seed
pnpm test
pnpm cleanup
```

## Module
- `src/use-cases/table.ts` creates pay-per-request single table with `pk/sk`, `gsi1`, streams.
- Supports put/get/update/query/GSI/scan/delete.

## Example
```ts
await createSingleTable("app");
await putItem({ pk:{S:"USER#1"}, sk:{S:"PROFILE"}, name:{S:"Ada"} }, "app");
const user = await getItem("USER#1", "PROFILE", "app");
```

## Runbook
Start Floci, run setup, seed, tests, cleanup. Real AWS: design access patterns first, avoid scans, use conditional writes, TTL, backups, alarms, and hot-key monitoring.
