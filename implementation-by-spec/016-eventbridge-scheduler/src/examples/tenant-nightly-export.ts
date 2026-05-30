#!/usr/bin/env tsx
import {
  buildTenantScheduleInput,
  createSchedule,
  createScheduleLifecyclePolicy,
  createSchedulerAuditEvent,
  createSchedulerRetryPolicy,
  createScheduleObservabilityPlan,
  cronExpression,
  estimateSchedulerMonthlyCost,
  scheduleTarget,
} from "../use-cases/schedules.js";

const scheduleName = "tenant-acme-nightly-export";
const target = scheduleTarget(
  "arn:aws:lambda:us-east-1:111122223333:function:tenant-export-worker",
  "arn:aws:iam::111122223333:role/scheduler-invoke-tenant-export",
  buildTenantScheduleInput({
    tenantId: "acme-retail",
    jobType: "nightly-s3-export",
    requestedBy: "data-platform",
    traceId: "trace-export-2026-05-30",
    payload: { bucket: "acme-tenant-exports", prefix: "acme-retail/daily/" },
  }),
  {
    deadLetterQueueArn: "arn:aws:sqs:us-east-1:111122223333:tenant-export-dlq",
    retryPolicy: createSchedulerRetryPolicy("standard"),
  },
);

console.log({
  useCase: "Tenant-scoped nightly data export",
  create: await createSchedule({
    name: scheduleName,
    expression: cronExpression("0", "2"),
    timezone: "UTC",
    groupName: "tenant-data-jobs",
    description: "Exports acme-retail data to S3 every night with DLQ and retries",
    target,
    flexibleWindowMinutes: 15,
  }),
  lifecycle: createScheduleLifecyclePolicy({ scheduleName, owner: "data-platform", environment: "prod", regulated: true }),
  observability: createScheduleObservabilityPlan(scheduleName, "lambda"),
  cost: estimateSchedulerMonthlyCost({ schedules: 500, invocationsPerSchedulePerDay: 1 }),
  audit: createSchedulerAuditEvent({
    operation: "CreateSchedule",
    scheduleName,
    actor: "data-platform-bot",
    targetArn: target.arn,
    outcome: "ALLOW",
    ticketId: "DATA-1042",
    reason: "Nightly tenant export with scoped payload, retry policy, and DLQ",
  }),
});
