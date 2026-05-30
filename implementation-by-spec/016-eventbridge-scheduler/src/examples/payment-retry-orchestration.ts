#!/usr/bin/env tsx
import {
  createRateSchedule,
  createScheduleObservabilityPlan,
  createSchedulerAuditEvent,
  createSchedulerRetryPolicy,
  everyMinutes,
  scheduleTarget,
} from "../use-cases/schedules.js";

const scheduleName = "payments-retry-drain";
const target = scheduleTarget(
  "arn:aws:states:us-east-1:111122223333:stateMachine:payment-retry-drain",
  "arn:aws:iam::111122223333:role/scheduler-start-payment-retry-sfn",
  { sourceQueue: "payment-retry", maxBatchSize: 100, idempotencyKeyPrefix: "payment-retry" },
  { deadLetterQueueArn: "arn:aws:sqs:us-east-1:111122223333:payment-retry-scheduler-dlq", retryPolicy: createSchedulerRetryPolicy("conservative") },
);

console.log({
  useCase: "Event-driven payment retry orchestration",
  create: await createRateSchedule(scheduleName, everyMinutes(5), target),
  observability: createScheduleObservabilityPlan(scheduleName, "step-functions"),
  audit: createSchedulerAuditEvent({
    operation: "CreateSchedule",
    scheduleName,
    actor: "payments-platform",
    targetArn: target.arn,
    outcome: "ALLOW",
    reason: "Drain payment retry queue through Step Functions every 5 minutes with DLQ and conservative retry",
  }),
});
