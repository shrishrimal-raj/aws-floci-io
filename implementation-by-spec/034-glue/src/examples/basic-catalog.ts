#!/usr/bin/env tsx
import { createDatabase, createParquetTable, deleteDatabase, deleteTable } from "../use-cases/catalog.js";
const db = `floci_glue_${Date.now()}`;
await createDatabase(db); await createParquetTable(db,"events","s3://bucket/events/"); await deleteTable(db,"events"); await deleteDatabase(db);
