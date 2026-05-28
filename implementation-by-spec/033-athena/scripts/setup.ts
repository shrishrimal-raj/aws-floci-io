#!/usr/bin/env tsx
import { createWorkGroup } from "../src/use-cases/queries.js";
export const workGroup = process.env.ATHENA_WORKGROUP ?? "floci-athena-lab";
await createWorkGroup(workGroup);
console.log(`Setup Athena workgroup ${workGroup}`);
