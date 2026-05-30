# 016 - EventBridge Scheduler

Enterprise scheduling patterns for one-time, rate, and cron jobs with JSON target input, DLQ/retry delivery, audit events, lifecycle cleanup, observability, cost controls, and disaster recovery planning.

## Quick start

```bash
docker compose up -d
pnpm install
cd implementation-by-spec/016-eventbridge-scheduler
pnpm setup
pnpm seed
pnpm test
pnpm cleanup
```

## Module map

- `src/client.ts` - EventBridge Scheduler SDK v3 client for Floci (`http://localhost:4566`).
- `src/use-cases/schedules.ts` - expression helpers, target builder, create/get/delete, audit, lifecycle, observability, cost.
- `src/examples/` - practical enterprise scenarios.
- `scripts/` - lab setup, seed, cleanup commands.

## Functions covered

| Function | Purpose | Practical use |
|---|---|---|
| `validateScheduleName` | Validates AWS-safe schedule names. | Tenant/user-generated schedules with clean audit logs. |
| `everyMinutes` | Builds `rate(n minutes)`. | Pollers, sync jobs, retry drains. |
| `cronExpression` | Builds Scheduler cron expressions. | Nightly exports, quarterly reports, weekly DR checks. |
| `atExpression` | Builds one-time `at(...)` expressions. | Trial reminders, delayed cleanup, contract renewal. |
| `scheduleTarget` | Creates target with role, input, DLQ, retry policy. | Invoke Lambda/SQS/Step Functions safely. |
| `createSchedule` | Creates generic schedule. | Full enterprise options: group, timezone, flexible window, cleanup. |
| `createRateSchedule` | Creates recurring rate schedule. | Every-5-minute payment retry orchestration. |
| `createOneTimeSchedule` | Creates one-shot schedule with delete-after-completion. | Customer notification or temp resource cleanup. |
| `getSchedule` | Reads schedule definition. | Admin UI, runbook, drift checks. |
| `deleteSchedule` | Idempotent schedule deletion. | Tests, tenant offboarding, one-time cleanup. |
| `createSchedulerRetryPolicy` | Standard delivery retry policy. | Tune retry age/attempts by workload risk. |
| `buildTenantScheduleInput` | Tenant-aware JSON payload. | Multi-tenant worker input with traceability. |
| `createSchedulerAuditEvent` | SIEM/EventBridge-ready audit event. | Track actor, target, ticket, outcome, reason. |
| `createScheduleLifecyclePolicy` | Retention, cleanup, backup, DR plan. | Regulated schedules and one-time job cleanup. |
| `createScheduleObservabilityPlan` | Metrics, alarms, logs, dashboard, runbook. | Monitor failed invocations and DLQ messages. |
| `estimateSchedulerMonthlyCost` | Invocation cost estimate. | Compare per-tenant schedules vs batched fan-out. |
| `shouldDeleteOneTimeSchedule` | Detects fired `at(...)` schedules. | Cleanup worker removes old temporary schedules. |

## Enterprise examples

Run pure planning examples with `pnpm tsx src/examples/<file>.ts`. Examples that create schedules require Floci or AWS-compatible endpoint.

- `basic-schedule.ts` - create/delete simple recurring schedule.
- `cron-expression.ts` - rate, cron, and at expression basics.
- `target-input.ts` - schedule with JSON target input.
- `tenant-nightly-export.ts` - Lambda tenant export with DLQ, retries, lifecycle, observability, cost, audit.
- `subscription-renewal-reminder.ts` - one-time SQS customer reminder with delete-after-completion cleanup.
- `payment-retry-orchestration.ts` - recurring Step Functions retry drain for event-driven payments.
- `compliance-evidence-collection.ts` - quarterly GRC evidence collection with long retention.
- `disaster-recovery-recreate-plan.ts` - cross-region schedule recreation plan for DR restore validation.
- `cost-optimized-tenant-fanout.ts` - cost comparison for per-tenant schedules vs batched fan-out.

## Minimal use

```ts
import { createSchedule, cronExpression, scheduleTarget, createSchedulerRetryPolicy } from "./src/index.js";

const target = scheduleTarget(
  "arn:aws:lambda:us-east-1:111122223333:function:tenant-export-worker",
  "arn:aws:iam::111122223333:role/scheduler-invoke-tenant-export",
  { tenantId: "acme", jobType: "nightly-export" },
  {
    deadLetterQueueArn: "arn:aws:sqs:us-east-1:111122223333:tenant-export-dlq",
    retryPolicy: createSchedulerRetryPolicy("standard"),
  },
);

await createSchedule({
  name: "tenant-acme-nightly-export",
  groupName: "tenant-data-jobs",
  expression: cronExpression("0", "2"),
  timezone: "UTC",
  flexibleWindowMinutes: 15,
  target,
});
```

## Runbook

1. Start Floci: `docker compose up -d`.
2. Check health from repo root: `pnpm run floci:health`.
3. Provision schedule: `pnpm setup`.
4. Seed fixture schedule/input: `pnpm seed`.
5. Run tests: `pnpm test` and `pnpm typecheck`.
6. Cleanup schedules: `pnpm cleanup`.

## Gotchas

- Target execution role must allow Scheduler to invoke target service.
- Use DLQ and retry policy for production target failures.
- One-time schedules should use `ActionAfterCompletion: DELETE` or cleanup worker.
- Flexible windows reduce cost/throttle spikes but make timing less exact.
- Prefer UTC unless product explicitly needs local timezone.
- For huge tenant fleets, batch fan-out can reduce cost and quota pressure.

## Floci vs Real AWS

Floci support is **partial**. Real AWS requires target execution role trust/permissions, schedule groups, DLQ, retry policy, time zones, flexible windows, one-shot cleanup, CloudWatch metrics, IAM least privilege, quotas, pricing review, and regional DR recreation metadata.
