#!/usr/bin/env tsx
import { createDailyBackupPlan } from "../src/use-cases/plans.js";
export const planName = process.env.BACKUP_PLAN ?? "floci-backup-lab";
const id = await createDailyBackupPlan(planName);
console.log(`Setup AWS Backup plan ${id}`);
