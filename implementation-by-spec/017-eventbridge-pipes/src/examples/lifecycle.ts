#!/usr/bin/env tsx
import { estimatePipeMonthlyCost, pipeFailureAlarm, pipeLifecycleDecision } from "../use-cases/pipes.js";

console.log({
  lifecycle: pipeLifecycleDecision({
    state: "RUNNING",
    lastEventAt: new Date("2026-01-01T00:00:00.000Z"),
    policy: { stopIfIdleAfterDays: 30, deleteIfStoppedAfterDays: 90 },
    now: new Date("2026-05-30T00:00:00.000Z"),
  }),
  monthlyCostUsd: estimatePipeMonthlyCost({ pipeCount: 3, monthlyRequests: 25_000_000 }),
  alarm: pipeFailureAlarm("orders-prod-sqs-to-eventbus"),
});
