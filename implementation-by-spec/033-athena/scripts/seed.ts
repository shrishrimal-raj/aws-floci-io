#!/usr/bin/env tsx
import { createExternalTableSql } from "../src/use-cases/queries.js";
console.log(createExternalTableSql("events","s3://floci-athena/events/"));
