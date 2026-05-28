#!/usr/bin/env tsx
import "./setup.js";
import { putItem, tableName } from "../src/use-cases/table.js";
await putItem({ pk:{S:"USER#1"}, sk:{S:"PROFILE"}, name:{S:"Ada"}, gsi1pk:{S:"EMAIL#ada@example.com"}, gsi1sk:{S:"USER#1"} }, tableName);
console.log(`Seed DynamoDB table ${tableName}`);
