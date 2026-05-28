#!/usr/bin/env tsx
import { createRateSchedule, deleteSchedule } from "../use-cases/schedules.js";
const name = `floci-schedule-${Date.now()}`;
await createRateSchedule(name,"rate(5 minutes)",{arn:"arn:aws:sqs:us-east-1:000000000000:q",roleArn:"arn:aws:iam::000000000000:role/r"});
await deleteSchedule(name);
