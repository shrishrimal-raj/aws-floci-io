#!/usr/bin/env tsx
import { createLogGroup, createLogStream, putRetentionDays } from "../src/use-cases/logs.js";
export const logGroup = process.env.LOG_GROUP ?? "/floci/logs/lab";
export const logStream = process.env.LOG_STREAM ?? "app";
await createLogGroup(logGroup); await createLogStream(logGroup,logStream); await putRetentionDays(logGroup,7);
console.log(`Setup CloudWatch Logs ${logGroup}/${logStream}`);
