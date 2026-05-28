#!/usr/bin/env tsx
import { createPostgresInstance } from "../src/use-cases/databases.js";
export const dbId = process.env.RDS_DB_ID ?? "floci-postgres-lab";
await createPostgresInstance({identifier:dbId});
console.log(`Setup RDS Postgres ${dbId}`);
