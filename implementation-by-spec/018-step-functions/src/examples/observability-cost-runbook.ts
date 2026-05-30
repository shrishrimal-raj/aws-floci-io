#!/usr/bin/env tsx
import { estimateStandardWorkflowCost, retryWithBackoff, workflowObservabilityPlan } from "../index.js";

console.log("CloudWatch dashboard plan", workflowObservabilityPlan("order-processing"));
console.log("cost estimate", estimateStandardWorkflowCost(250_000, 15));

let attempts = 0;
await retryWithBackoff(
  async () => {
    attempts++;
    if (attempts < 2) throw new Error("ThrottlingException");
    return "started";
  },
  { attempts: 2, sleep: async () => undefined }
);

console.log("runbook", [
  "Alarm on failed/timed-out executions and execution throttling",
  "Inspect execution input/output with PII redaction",
  "Use idempotency key before manual redrive",
  "Watch transition count for runaway loops",
]);
