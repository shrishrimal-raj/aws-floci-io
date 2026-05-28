#!/usr/bin/env tsx
import { createLogGroup, createLogStream, deleteLogGroup, putJsonLog, structuredLog } from "../use-cases/logs.js";
const group = `/floci/example/${Date.now()}`;
await createLogGroup(group); await createLogStream(group,"app"); await putJsonLog(group,"app",structuredLog("info","hello"));
await deleteLogGroup(group);
