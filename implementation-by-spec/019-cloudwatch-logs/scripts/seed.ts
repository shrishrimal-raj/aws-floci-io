#!/usr/bin/env tsx
import { logGroup, logStream } from "./setup.js";
import { putJsonLog, structuredLog } from "../src/use-cases/logs.js";
await putJsonLog(logGroup,logStream,structuredLog("info","seed"));
console.log(`Seed CloudWatch Logs ${logGroup}/${logStream}`);
