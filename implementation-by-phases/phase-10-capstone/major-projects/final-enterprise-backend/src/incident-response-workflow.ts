import { createAuditRecord, eventRoute, observabilityPlan, type TenantContext } from "../../../src/index.js";

/**
 * Real-world scenario: production incident response for multi-service backend.
 * Demonstrates audit logging, EventBridge notifications, CloudWatch alarms, and safe rollback steps.
 */
export function buildIncidentResponseWorkflow(context: TenantContext, incidentId: string) {
  const observability = observabilityPlan("checkout-api");
  return {
    incidentId,
    audit: createAuditRecord(context, "incident.rollback.requested", incidentId, "allowed", "operator has incident-admin role"),
    notificationRoute: eventRoute("ops.incident", "IncidentDeclared", ["pagerduty-topic", "slack-lambda", "status-page-lambda"], "ops-bus"),
    alarmsToInspect: observability.alarms,
    rollbackSteps: [
      "Freeze deployment pipeline in CodeBuild/CodeDeploy",
      "Shift traffic to last healthy ECS task set or Lambda alias",
      "Pause EventBridge consumers if downstream writes are unsafe",
      "Replay DLQ after fix and idempotency verification",
      "Attach postmortem and audit records to compliance evidence",
    ],
  };
}
