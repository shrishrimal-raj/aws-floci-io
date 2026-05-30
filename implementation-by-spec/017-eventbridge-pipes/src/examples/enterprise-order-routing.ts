#!/usr/bin/env tsx
import {
  estimatePipeMonthlyCost,
  pipeAuditEvent,
  pipeFailureAlarm,
  pipeLifecycleDecision,
  pipeName,
  redactPipeSpec,
  tenantEventFilter,
  withPipeRetry,
} from "../use-cases/pipes.js";

/**
 * Enterprise scenario: secure SQS -> EventBridge routing with tenant filter, audit, retry, monitoring, lifecycle, and cost forecast.
 */
const name = pipeName({ app: "commerce", environment: "prod", source: "orders-queue", target: "orders-bus" });
const spec = {
  name,
  sourceArn: "arn:aws:sqs:us-east-1:123456789012:commerce-orders-prod",
  targetArn: "arn:aws:events:us-east-1:123456789012:event-bus/commerce-orders-prod",
  roleArn: "arn:aws:iam::123456789012:role/commerce-orders-pipe",
  filterPattern: tenantEventFilter("tenant-enterprise", ["order.created", "order.paid"]),
};

const retryResult = await withPipeRetry(async () => "validated", 2, 1);

console.log({
  retryResult,
  safeSpec: redactPipeSpec(spec),
  audit: pipeAuditEvent({ pipeName: name, actor: "cicd", action: "create", outcome: "success", details: { source: "sqs", target: "eventbridge" } }),
  monitoring: pipeFailureAlarm(name, 1),
  lifecycle: pipeLifecycleDecision({ state: "RUNNING", lastEventAt: new Date("2026-05-01"), policy: { stopIfIdleAfterDays: 14, deleteIfStoppedAfterDays: 30 }, now: new Date("2026-05-30") }),
  cost: estimatePipeMonthlyCost({ pipeCount: 1, monthlyRequests: 10_000_000 }),
});
