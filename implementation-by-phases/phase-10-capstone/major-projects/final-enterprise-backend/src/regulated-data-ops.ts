import { complianceControls, dataLifecyclePolicy, disasterRecoveryPlan, observabilityPlan } from "../../../src/index.js";

/**
 * Real-world scenario: regulated analytics backend.
 * Demonstrates lifecycle management, compliance evidence, observability, backup, and DR planning.
 */
export function buildRegulatedDataOpsPlan() {
  return {
    datasets: [
      dataLifecyclePolicy("customer-events", 2555, 30, 365, "legal-hold"),
      dataLifecyclePolicy("derived-metrics", 1095, 14, 180),
      dataLifecyclePolicy("debug-logs", 90, 7, 30),
    ],
    observability: observabilityPlan("regulated-analytics"),
    disasterRecovery: disasterRecoveryPlan("regulated-analytics", "warm-standby"),
    compliance: complianceControls("SOC2"),
    backupEvidence: ["daily AWS Backup report", "quarterly restore drill", "CloudWatch alarm history", "incident postmortem archive"],
  };
}
