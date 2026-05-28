#!/usr/bin/env tsx
import { createRateSchedule } from "../src/use-cases/schedules.js";
export const scheduleName = process.env.SCHEDULE_NAME ?? "floci-scheduler-lab";
await createRateSchedule(scheduleName,"rate(5 minutes)",{arn:"arn:aws:sqs:us-east-1:000000000000:target",roleArn:"arn:aws:iam::000000000000:role/scheduler"});
console.log(`Setup schedule ${scheduleName}`);
