#!/usr/bin/env tsx
import {
  createSingleTable,
  deleteTable,
  putItem,
  queryByPkPage,
} from "../use-cases/table.js";

const table = `floci-ddb-page-${Date.now()}`;

await createSingleTable(table);
await putItem(
  { pk: { S: "USER#1" }, sk: { S: "ORDER#1" }, total: { N: "42" } },
  table,
);
await putItem(
  { pk: { S: "USER#1" }, sk: { S: "ORDER#2" }, total: { N: "99" } },
  table,
);

const firstPage = await queryByPkPage("USER#1", 1, undefined, table);
console.log(firstPage.items);
console.log(firstPage.lastEvaluatedKey);

await deleteTable(table);
