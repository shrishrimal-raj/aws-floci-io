#!/usr/bin/env tsx
import { createExternalTableSql, startQuery } from "../use-cases/queries.js";
const sql = createExternalTableSql("events","s3://bucket/events/");
console.log(await startQuery(sql));
