#!/usr/bin/env tsx
import { createSingleTable, deleteTable, getItem, putItem, queryByPk } from "../use-cases/table.js";
const table = `floci-ddb-example-${Date.now()}`;
await createSingleTable(table);
await putItem({ pk:{S:"USER#1"}, sk:{S:"PROFILE"}, name:{S:"Ada"} }, table);
console.log(await getItem("USER#1","PROFILE",table));
console.log(await queryByPk("USER#1",table));
await deleteTable(table);
