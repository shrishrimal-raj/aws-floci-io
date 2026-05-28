#!/usr/bin/env tsx
import { deleteWorkGroup } from "../src/use-cases/queries.js";
const workGroup = process.env.ATHENA_WORKGROUP ?? "floci-athena-lab";
await deleteWorkGroup(workGroup);
console.log(`Cleanup Athena workgroup ${workGroup}`);
