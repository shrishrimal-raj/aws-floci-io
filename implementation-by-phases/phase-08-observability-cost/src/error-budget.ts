export interface ServiceSlo {
  service: string;
  targetAvailability: number;
  totalRequests: number;
  failedRequests: number;
}

export interface AlarmState {
  name: string;
  state: "OK" | "ALARM" | "INSUFFICIENT_DATA";
  reason: string;
}

/**
 * Calculates observed availability percentage from request totals.
 *
 * Example: API command center converts ALB/Lambda success and failure counts into SLO dashboard percentage.
 */
export function availabilityPercent(slo: ServiceSlo): number {
  if (slo.totalRequests === 0) return 100;
  return Number((((slo.totalRequests - slo.failedRequests) / slo.totalRequests) * 100).toFixed(3));
}

/**
 * Calculates remaining error budget percentage for an SLO window.
 *
 * Example: weekly platform review flags service as at risk when only 20% of allowed failures remain.
 */
export function errorBudgetRemaining(slo: ServiceSlo): number {
  const allowedFailures = slo.totalRequests * (1 - slo.targetAvailability / 100);
  if (allowedFailures <= 0) return 0;
  return Number(Math.max(0, ((allowedFailures - slo.failedRequests) / allowedFailures) * 100).toFixed(2));
}

/**
 * Combines SLO math and CloudWatch alarm state into health status.
 *
 * Example: Slack alert uses `breached` when 5xx alarm fires even if request aggregate has not crossed SLO yet.
 */
export function serviceHealth(slo: ServiceSlo, alarms: AlarmState[]): "healthy" | "at_risk" | "breached" {
  if (alarms.some((alarm) => alarm.state === "ALARM")) return "breached";
  if (availabilityPercent(slo) < slo.targetAvailability) return "breached";
  if (errorBudgetRemaining(slo) < 25) return "at_risk";
  return "healthy";
}

/**
 * Formats concise Slack/PagerDuty-friendly alert text.
 *
 * Example: incident bot posts `[BREACHED] checkout-api: 5xx alarm active` to on-call channel.
 */
export function slackAlertText(service: string, health: ReturnType<typeof serviceHealth>, reason: string): string {
  return `[${health.toUpperCase()}] ${service}: ${reason}`;
}

/**
 * Calculates burn rate against allowed failure ratio.
 *
 * Example: burn rate above 2 means service consumes budget twice as fast as allowed for current window.
 */
export function errorBudgetBurnRate(slo: ServiceSlo): number {
  if (slo.totalRequests === 0) return 0;
  const observedFailureRate = slo.failedRequests / slo.totalRequests;
  const allowedFailureRate = 1 - slo.targetAvailability / 100;
  if (allowedFailureRate <= 0) return observedFailureRate > 0 ? Number.POSITIVE_INFINITY : 0;
  return Number((observedFailureRate / allowedFailureRate).toFixed(2));
}

/**
 * Builds incident summary with health, availability, budget, and burn-rate fields.
 *
 * Example: command center returns this object to UI cards, Slack templates, and weekly SRE reports.
 */
export function serviceHealthSummary(slo: ServiceSlo, alarms: AlarmState[]): Record<string, unknown> {
  const health = serviceHealth(slo, alarms);
  return {
    service: slo.service,
    health,
    availability: availabilityPercent(slo),
    targetAvailability: slo.targetAvailability,
    errorBudgetRemaining: errorBudgetRemaining(slo),
    burnRate: errorBudgetBurnRate(slo),
    activeAlarms: alarms.filter((alarm) => alarm.state === "ALARM").map((alarm) => alarm.name),
  };
}
