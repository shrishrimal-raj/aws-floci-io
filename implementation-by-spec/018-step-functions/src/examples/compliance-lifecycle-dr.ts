#!/usr/bin/env tsx
import { workflowComplianceControls, workflowDisasterRecoveryPlan, workflowLifecyclePlan } from "../index.js";

console.log("lifecycle", workflowLifecyclePlan("regulated-payment-workflow", 2_555, 14));
console.log("disaster recovery", workflowDisasterRecoveryPlan("regulated-payment-workflow", "cross-region-standby"));
console.log("compliance", workflowComplianceControls("SOC2"));
console.log("runbook", [
  "Keep workflow input free of raw PII; pass IDs only",
  "Persist business state in DynamoDB/RDS before and after critical tasks",
  "Version ASL in Git and deploy to standby region",
  "Restart failed work from idempotency key after incident",
]);
