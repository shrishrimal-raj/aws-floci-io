# 016 - EventBridge Scheduler

> Modern one-time, rate, and cron schedules with JSON target input, flexible windows disabled for deterministic labs, and idempotent cleanup.

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

## Module

- `src/client.ts` - EventBridge Scheduler SDK v3 client for Floci (`http://localhost:4566`).
- `src/use-cases/schedules.ts` - rate/cron/at expression helpers, target builder, schedule create/get/delete.
- `src/examples/basic-schedule.ts` - create a simple recurring schedule.
- `src/examples/cron-expression.ts` - build `rate`, `cron`, and `at` expressions.
- `src/examples/target-input.ts` - create schedule with JSON target input.
- `scripts/setup.ts` - creates lab schedule.
- `scripts/seed.ts` - creates fixture schedule/event input.
- `scripts/cleanup.ts` - deletes lab schedule.

## Operations covered

| Operation | Function | Notes |
|---|---|---|
| Rate expression | `everyMinutes` | Builds `rate(n minutes)`. |
| Cron expression | `cronExpression` | Builds six-field EventBridge cron expression. |
| One-time expression | `atExpression` | Converts ISO timestamp to `at(...)`. |
| Target builder | `scheduleTarget` | Target ARN, role ARN, optional JSON input. |
| Create schedule | `createSchedule` | Generic helper for any schedule expression. |
| Create rate schedule | `createRateSchedule` | Convenience recurring schedule helper. |
| Create one-time schedule | `createOneTimeSchedule` | Convenience one-shot helper. |
| Get schedule | `getSchedule` | Reads schedule definition and target. |
| Delete schedule | `deleteSchedule` | Idempotent cleanup for missing schedules. |

## Use cases

```ts
import { createSchedule, everyMinutes, scheduleTarget, deleteSchedule } from "./src/index.js";

const target = scheduleTarget(
  "arn:aws:sqs:us-east-1:000000000000:jobs",
  "arn:aws:iam::000000000000:role/scheduler-target",
  { job: "sync" }
);
await createSchedule({ name: "sync-every-15", expression: everyMinutes(15), target });
await deleteSchedule("sync-every-15");
```

## Runbook

1. Start Floci: `docker compose up -d`.
2. Check health: `pnpm run floci:health` from repo root.
3. Provision schedule: `pnpm setup`.
4. Seed fixture schedule/input: `pnpm seed`.
5. Run tests: `pnpm test`.
6. Cleanup schedule: `pnpm cleanup`.

## Gotchas

- Scheduler targets require an IAM role that allows invoking target service in real AWS.
- `at(...)` timestamps do not include trailing `Z` in Scheduler expression syntax.
- One-shot schedules are not automatically deleted after firing; clean them up if they are temporary.
- Flexible time windows can reduce load spikes but make timing less exact; lab uses `OFF`.
- Time zones matter for cron schedules; prefer UTC unless product requires local time.
- Configure retry policy and DLQ for target failures in production.

## Floci vs Real AWS

Floci support: **partial** for this lab. On real AWS, configure target execution role, retry policy, DLQ, schedule groups, time zones, flexible windows, one-shot cleanup, CloudWatch metrics, and least-privilege IAM. Real AWS also has per-schedule quotas, target-specific permissions, delivery retries, schedule group ARNs, and pricing that local Floci does not fully model.
