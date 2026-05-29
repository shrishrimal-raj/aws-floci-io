#!/usr/bin/env tsx
import { createSchedule, everyMinutes, scheduleTarget } from "../use-cases/schedules.js";

const target = scheduleTarget(
  "arn:aws:sqs:us-east-1:000000000000:jobs",
  "arn:aws:iam::000000000000:role/scheduler-target",
  { job: "sync" }
);

console.log(await createSchedule({ name: `floci-scheduler-${Date.now()}`, expression: everyMinutes(15), target }));
