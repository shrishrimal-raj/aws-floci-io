#!/usr/bin/env tsx
import { deleteDatabase, deleteTable } from "../src/use-cases/catalog.js";
const databaseName = process.env.GLUE_DATABASE ?? "floci_glue_lab";
await deleteTable(databaseName,"events"); await deleteDatabase(databaseName);
console.log(`Cleanup Glue database ${databaseName}`);
