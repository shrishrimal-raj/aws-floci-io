#!/usr/bin/env tsx
import {
  createSingleTable,
  deleteItemsByPk,
  deleteTable,
  putJsonEntity,
  queryAllByPk,
} from "../use-cases/table.js";

const table = `floci-ddb-lifecycle-${Date.now()}`;
await createSingleTable(table);

const pk = "TENANT#acme-retail#SESSION#session-123";
await putJsonEntity(
  {
    pk,
    sk: "CART#1",
    entityType: "CartItem",
    value: { sku: "sku-1", quantity: 2 },
  },
  table,
);
await putJsonEntity(
  {
    pk,
    sk: "CART#2",
    entityType: "CartItem",
    value: { sku: "sku-2", quantity: 1 },
  },
  table,
);

console.log({ beforeCleanup: await queryAllByPk(pk, 10, table) });
const deleted = await deleteItemsByPk(pk, table);
console.log({
  deleted,
  afterCleanup: await queryAllByPk(pk, 10, table),
  productionNote:
    "prefer native DynamoDB TTL for expiry; explicit cleanup is useful for tenant offboarding and tests",
});

await deleteTable(table);
