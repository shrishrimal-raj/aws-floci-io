#!/usr/bin/env tsx
import { deletePostgresInstance } from "../src/use-cases/databases.js";
const dbId = process.env.RDS_DB_ID ?? "floci-postgres-lab";
await deletePostgresInstance(dbId);
console.log(`Cleanup RDS Postgres ${dbId}`);
