#!/usr/bin/env tsx
import { createSchedulerAuditEvent, estimateSchedulerMonthlyCost, everyMinutes } from "../use-cases/schedules.js";

const oneSchedulePerTenant = estimateSchedulerMonthlyCost({ schedules: 2_000, invocationsPerSchedulePerDay: 96 });
const batchedFanout = estimateSchedulerMonthlyCost({ schedules: 1, invocationsPerSchedulePerDay: 96 });

console.log({
  useCase: "Cost-optimized tenant fan-out",
  pattern: "Use one scheduler rule every 15 minutes to enqueue tenant IDs, instead of 2,000 individual low-value schedules.",
  expression: everyMinutes(15),
  oneSchedulePerTenant,
  batchedFanout,
  monthlySavingsUsd: Number((oneSchedulePerTenant.estimatedMonthlyUsd - batchedFanout.estimatedMonthlyUsd).toFixed(2)),
  audit: createSchedulerAuditEvent({
    operation: "ArchitectureDecision",
    scheduleName: "tenant-fanout-every-15",
    actor: "platform-architecture",
    outcome: "ALLOW",
    reason: "Reduce Scheduler invocation cost and quota pressure with batched fan-out worker",
    ticketId: "ARCH-2026-014",
  }),
});
