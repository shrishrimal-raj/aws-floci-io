#!/usr/bin/env tsx
import { deleteSchedule } from "../src/use-cases/schedules.js";
const scheduleName = process.env.SCHEDULE_NAME ?? "floci-scheduler-lab";
await deleteSchedule(scheduleName);
console.log(`Cleanup schedule ${scheduleName}`);
