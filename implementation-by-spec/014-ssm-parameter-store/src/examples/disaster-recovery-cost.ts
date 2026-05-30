#!/usr/bin/env tsx
import { parameterCostOptimizationPlan, parameterDisasterRecoveryPlan, parameterLifecyclePolicy } from "../index.js";

console.log(
  JSON.stringify(
    {
      disasterRecovery: parameterDisasterRecoveryPlan("claims-api", "prod", "us-west-2"),
      lifecycle: parameterLifecyclePolicy({
        path: "/claims-api/prod/*",
        owner: "insurance-platform",
        classification: "confidential",
        maxAgeDays: 730,
        backupRequired: true,
      }),
      costOptimization: parameterCostOptimizationPlan("/claims-api/prod", 18_000),
    },
    null,
    2
  )
);
