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

export function availabilityPercent(slo: ServiceSlo): number {
  if (slo.totalRequests === 0) return 100;
  return Number((((slo.totalRequests - slo.failedRequests) / slo.totalRequests) * 100).toFixed(3));
}

export function errorBudgetRemaining(slo: ServiceSlo): number {
  const allowedFailures = slo.totalRequests * (1 - slo.targetAvailability / 100);
  if (allowedFailures <= 0) return 0;
  return Number(Math.max(0, ((allowedFailures - slo.failedRequests) / allowedFailures) * 100).toFixed(2));
}

export function serviceHealth(slo: ServiceSlo, alarms: AlarmState[]): "healthy" | "at_risk" | "breached" {
  if (alarms.some((alarm) => alarm.state === "ALARM")) return "breached";
  if (availabilityPercent(slo) < slo.targetAvailability) return "breached";
  if (errorBudgetRemaining(slo) < 25) return "at_risk";
  return "healthy";
}

export function slackAlertText(service: string, health: ReturnType<typeof serviceHealth>, reason: string): string {
  return `[${health.toUpperCase()}] ${service}: ${reason}`;
}
