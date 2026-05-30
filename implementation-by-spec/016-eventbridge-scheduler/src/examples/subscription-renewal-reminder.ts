#!/usr/bin/env tsx
import {
  atExpression,
  buildTenantScheduleInput,
  createOneTimeSchedule,
  createScheduleLifecyclePolicy,
  createSchedulerAuditEvent,
  createSchedulerRetryPolicy,
  scheduleTarget,
  shouldDeleteOneTimeSchedule,
} from "../use-cases/schedules.js";

const fireAt = new Date(Date.now() + 7 * 24 * 60 * 60_000).toISOString();
const scheduleName = "trial-acme-renewal-reminder";
const target = scheduleTarget(
  "arn:aws:sqs:us-east-1:111122223333:customer-notifications",
  "arn:aws:iam::111122223333:role/scheduler-send-notification",
  buildTenantScheduleInput({
    tenantId: "acme-retail",
    jobType: "trial-renewal-reminder",
    requestedBy: "billing-service",
    traceId: "trial-9001",
    payload: { customerId: "cust-9001", plan: "enterprise", renewalDate: fireAt },
  }),
  { deadLetterQueueArn: "arn:aws:sqs:us-east-1:111122223333:customer-notifications-dlq", retryPolicy: createSchedulerRetryPolicy("fast") },
);

console.log({
  useCase: "One-time subscription renewal reminder",
  expression: atExpression(fireAt),
  create: await createOneTimeSchedule(scheduleName, fireAt, target),
  lifecycle: createScheduleLifecyclePolicy({ scheduleName, owner: "billing-service", environment: "prod", oneTime: true }),
  cleanupCheck: shouldDeleteOneTimeSchedule(atExpression("2026-01-01T00:00:00Z"), new Date("2026-01-01T01:00:00Z")),
  audit: createSchedulerAuditEvent({
    operation: "CreateSchedule",
    scheduleName,
    actor: "billing-service",
    targetArn: target.arn,
    outcome: "ALLOW",
    traceId: "trial-9001",
    reason: "One-time customer renewal notification deletes after completion",
  }),
});
