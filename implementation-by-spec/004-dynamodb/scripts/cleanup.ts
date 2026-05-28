#!/usr/bin/env tsx
import { deleteTable, tableName } from "../src/use-cases/table.js";
await deleteTable(tableName);
console.log(`Cleanup DynamoDB table ${tableName}`);
