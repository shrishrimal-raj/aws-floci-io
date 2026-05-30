#!/usr/bin/env tsx
import {
  createScheduleLifecyclePolicy,
  createSchedulerAuditEvent,
  createScheduleObservabilityPlan,
  cronExpression,
  scheduleTarget,
} from "../use-cases/schedules.js";

const scheduleName = "backup-restore-validation";
const target = scheduleTarget(
  "arn:aws:lambda:us-west-2:111122223333:function:backup-restore-validator",
  "arn:aws:iam::111122223333:role/scheduler-invoke-dr-validator",
  { recoveryRegion: "us-west-2", restorePlan: "orders-prod-pitr", evidenceBucket: "dr-evidence" },
);

console.log({
  useCase: "Backup and disaster recovery schedule recreation plan",
  sourceRegionSchedule: {
    name: scheduleName,
    expression: cronExpression("0", "6", "?", "*", "SUN"),
    target,
    groupName: "dr-runbooks",
  },
  lifecycle: createScheduleLifecyclePolicy({ scheduleName, owner: "resilience-team", environment: "prod", regulated: true }),
  observability: createScheduleObservabilityPlan(scheduleName, "lambda"),
  audit: createSchedulerAuditEvent({
    operation: "PlanScheduleRecreate",
    scheduleName,
    actor: "resilience-team",
    targetArn: target.arn,
    outcome: "ALLOW",
    ticketId: "DR-2026-05",
    reason: "Document cross-region schedule recreation for weekly restore validation",
  }),
});
