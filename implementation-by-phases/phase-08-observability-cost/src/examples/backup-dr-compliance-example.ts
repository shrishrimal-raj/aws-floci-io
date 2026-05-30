import { backupCompliance, disasterRecoveryPosture } from "../ops-cost.js";
import { opsAuditEvent } from "../enterprise-patterns.js";

/**
 * Real-world resilience pattern: evaluate backup coverage, find critical gaps, and audit exception workflow.
 */
export function backupDrComplianceExample() {
  const resources = [
    { arn: "arn:aws:rds:us-east-1:123:db/prod-orders", protected: true, criticality: "high" as const },
    { arn: "arn:aws:dynamodb:us-east-1:123:table/audit-events", protected: false, criticality: "high" as const },
    { arn: "arn:aws:s3:::dev-scratch", protected: false, criticality: "low" as const },
  ];

  return {
    backup: backupCompliance(resources),
    disasterRecovery: disasterRecoveryPosture(resources),
    audit: opsAuditEvent({
      actor: "backup-admin",
      action: "Backup.ExceptionRequested",
      resource: "arn:aws:dynamodb:us-east-1:123:table/audit-events",
      outcome: "success",
      details: { reason: "waiting for PITR enablement window" },
    }),
  };
}
