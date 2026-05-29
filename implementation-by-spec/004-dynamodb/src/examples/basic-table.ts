#!/usr/bin/env tsx
import {
  createSingleTable,
  deleteItem,
  deleteTable,
  getItem,
  putItem,
  putItemIfAbsent,
  queryByPk,
} from "../use-cases/table.js";
const table = `floci-ddb-example-${Date.now()}`;
await createSingleTable(table);
await putItem(
  { pk: { S: "USER#1" }, sk: { S: "PROFILE" }, name: { S: "Ada" } },
  table,
);
await putItemIfAbsent(
  { pk: { S: "USER#1" }, sk: { S: "SETTINGS" }, theme: { S: "dark" } },
  table,
);
console.log(await getItem("USER#1", "PROFILE", table));
console.log(await queryByPk("USER#1", table));
await deleteItem("USER#1", "SETTINGS", table);
await deleteTable(table);
