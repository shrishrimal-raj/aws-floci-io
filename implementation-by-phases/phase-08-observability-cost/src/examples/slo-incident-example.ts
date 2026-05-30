import { serviceHealthSummary, slackAlertText, type AlarmState, type ServiceSlo } from "../error-budget.js";
import { opsAuditEvent, redactOpsPayload } from "../enterprise-patterns.js";

/**
 * Real-world incident pattern: summarize SLO health, build Slack text, and create redacted audit event.
 */
export function sloIncidentExample() {
  const slo: ServiceSlo = { service: "checkout-api", targetAvailability: 99.9, totalRequests: 1_000_000, failedRequests: 1_500 };
  const alarms: AlarmState[] = [{ name: "checkout-5xx", state: "ALARM", reason: "5xx > 1% for 5 minutes" }];
  const summary = serviceHealthSummary(slo, alarms);

  return {
    summary,
    alert: slackAlertText(slo.service, summary.health as "healthy" | "at_risk" | "breached", "5xx alarm active"),
    audit: opsAuditEvent({
      actor: "sre-oncall",
      action: "Incident.Acknowledge",
      resource: slo.service,
      outcome: "success",
      details: redactOpsPayload({ alarm: "checkout-5xx", webhookUrl: "https://hooks.slack.example/secret" }),
    }),
  };
}
