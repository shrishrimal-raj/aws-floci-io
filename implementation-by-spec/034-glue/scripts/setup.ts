#!/usr/bin/env tsx
import { createDatabase, createParquetTable } from "../src/use-cases/catalog.js";
export const databaseName = process.env.GLUE_DATABASE ?? "floci_glue_lab";
await createDatabase(databaseName); await createParquetTable(databaseName,"events","s3://floci-glue/events/");
console.log(`Setup Glue database ${databaseName}`);
