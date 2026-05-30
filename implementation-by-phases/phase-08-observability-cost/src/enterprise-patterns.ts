import { budgetVariancePercent, forecastMonthlyCost, groupCostByTag, type CostLineItem, type TaggedResource } from "./ops-cost.js";
import { serviceHealthSummary, type AlarmState, type ServiceSlo } from "./error-budget.js";

export interface OpsAuditEvent {
  actor: string;
  action: string;
  resource: string;
  outcome: "success" | "denied" | "failed";
  at: string;
  details?: Record<string, unknown>;
}

export interface CostAnomaly {
  service: string;
  amountUsd: number;
  baselineUsd: number;
  variancePercent: number;
}

/**
 * Builds audit event for operations actions like alarm acknowledge, budget override, or backup exception.
 *
 * Example: FinOps admin approving temporary budget increase records actor, resource, and safe details for SIEM export.
 */
export function opsAuditEvent(input: Omit<OpsAuditEvent, "at">, now = new Date()): OpsAuditEvent {
  return { ...input, at: now.toISOString() };
}

/**
 * Redacts sensitive values from operational payloads before logging.
 *
 * Example: ticket payload keeps account ID and resource ARN but removes webhook URL, API token, or Slack secret.
 */
export function redactOpsPayload<T extends Record<string, unknown>>(
  input: T,
  sensitiveKeys = ["token", "secret", "password", "webhookUrl", "authorization"]
): Record<string, unknown> {
  const blocked = new Set(sensitiveKeys.map((key) => key.toLowerCase()));
  return Object.fromEntries(Object.entries(input).map(([key, value]) => [key, blocked.has(key.toLowerCase()) ? "[REDACTED]" : value]));
}

/**
 * Finds services whose daily cost is materially above baseline.
 *
 * Example: nightly Cost Explorer import flags sudden DynamoDB spend growth after bad GSI query pattern.
 */
export function detectCostAnomalies(items: CostLineItem[], baselines: Record<string, number>, thresholdPercent = 25): CostAnomaly[] {
  const byService = items.reduce<Record<string, number>>((acc, item) => {
    acc[item.service] = Number(((acc[item.service] ?? 0) + item.amountUsd).toFixed(2));
    return acc;
  }, {});
  return Object.entries(byService)
    .map(([service, amountUsd]) => {
      const baselineUsd = baselines[service] ?? 0;
      const variancePercent = budgetVariancePercent(amountUsd, baselineUsd);
      return { service, amountUsd, baselineUsd, variancePercent };
    })
    .filter((anomaly) => anomaly.variancePercent >= thresholdPercent);
}

/**
 * Builds executive command-center snapshot across health, forecast, budget, and allocation tags.
 *
 * Example: dashboard loads this object for one product line and renders SLO state beside projected monthly spend.
 */
export function commandCenterSnapshot(input: {
  slo: ServiceSlo;
  alarms: AlarmState[];
  dailyCosts: number[];
  budgetUsd: number;
  costs: CostLineItem[];
  allocationTag?: string;
}): Record<string, unknown> {
  const forecastUsd = forecastMonthlyCost(input.dailyCosts);
  return {
    health: serviceHealthSummary(input.slo, input.alarms),
    forecastUsd,
    budgetUsd: input.budgetUsd,
    budgetVariancePercent: budgetVariancePercent(forecastUsd, input.budgetUsd),
    costByTag: groupCostByTag(input.costs, input.allocationTag ?? "Project"),
  };
}

/**
 * Builds compliance ticket payload for resources missing tags.
 *
 * Example: AWS Config remediation Lambda sends this payload to Jira/ServiceNow for owner correction.
 */
export function tagComplianceTicket(resource: TaggedResource, missingTags: string[]): Record<string, unknown> {
  return {
    title: `Missing required tags on ${resource.arn}`,
    severity: resource.tags.Environment === "prod" ? "high" : "medium",
    resourceArn: resource.arn,
    missingTags,
    currentTags: resource.tags,
  };
}
