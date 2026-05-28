#!/usr/bin/env tsx
import { deleteLogGroup } from "../src/use-cases/logs.js";
const logGroup = process.env.LOG_GROUP ?? "/floci/logs/lab";
await deleteLogGroup(logGroup);
console.log(`Cleanup CloudWatch Logs ${logGroup}`);
