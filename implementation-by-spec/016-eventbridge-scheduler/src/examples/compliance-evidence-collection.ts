#!/usr/bin/env tsx
import {
  createSchedule,
  createScheduleLifecyclePolicy,
  createSchedulerAuditEvent,
  createSchedulerRetryPolicy,
  cronExpression,
  scheduleTarget,
} from "../use-cases/schedules.js";

const scheduleName = "grc-quarterly-evidence-collection";
const target = scheduleTarget(
  "arn:aws:lambda:us-east-1:111122223333:function:collect-grc-evidence",
  "arn:aws:iam::111122223333:role/scheduler-invoke-grc-evidence",
  {
    controls: ["IAM_ACCESS_REVIEW", "CLOUDTRAIL_ENABLED", "BACKUP_RECOVERY_TESTED"],
    evidenceBucket: "regulated-bank-grc-evidence",
    retentionDays: 2555,
  },
  { deadLetterQueueArn: "arn:aws:sqs:us-east-1:111122223333:grc-evidence-dlq", retryPolicy: createSchedulerRetryPolicy("conservative") },
);

console.log({
  useCase: "Quarterly compliance evidence collection",
  create: await createSchedule({
    name: scheduleName,
    expression: cronExpression("0", "9", "1", "1,4,7,10", "?"),
    timezone: "UTC",
    groupName: "compliance",
    description: "Collect GRC evidence quarterly and store immutable records",
    target,
    flexibleWindowMinutes: 60,
  }),
  lifecycle: createScheduleLifecyclePolicy({ scheduleName, owner: "security-grc", environment: "prod", regulated: true }),
  audit: createSchedulerAuditEvent({
    operation: "CreateSchedule",
    scheduleName,
    actor: "security-grc",
    targetArn: target.arn,
    outcome: "ALLOW",
    ticketId: "GRC-2026-Q2",
    reason: "Quarterly compliance evidence collection with long retention",
  }),
});
