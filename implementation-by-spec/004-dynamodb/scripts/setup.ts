#!/usr/bin/env tsx
import { createSingleTable, tableName } from "../src/use-cases/table.js";
await createSingleTable(tableName);
console.log(`Setup DynamoDB table ${tableName}`);
