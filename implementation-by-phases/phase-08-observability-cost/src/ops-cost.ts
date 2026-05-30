export interface MetricDatum {
  namespace: string;
  service: string;
  name: string;
  value: number;
  unit: "Count" | "Milliseconds" | "Percent" | "Bytes";
  dimensions?: Record<string, string>;
}

export interface TaggedResource {
  arn: string;
  tags: Record<string, string | undefined>;
}

export interface CostLineItem {
  service: string;
  amountUsd: number;
  tags: Record<string, string | undefined>;
}

export interface BackupPlanResource {
  arn: string;
  protected: boolean;
  criticality?: "low" | "medium" | "high";
}

export const REQUIRED_TAGS = ["Environment", "Owner", "CostCenter", "Project"] as const;

/**
 * Serializes one metric into CloudWatch Embedded Metric Format JSON.
 *
 * Example: Lambda logs this string so CloudWatch extracts `Latency` metric without separate PutMetricData call.
 */
export function toEmbeddedMetricFormat(metric: MetricDatum): string {
  return JSON.stringify({
    _aws: {
      Timestamp: Date.now(),
      CloudWatchMetrics: [
        {
          Namespace: metric.namespace,
          Dimensions: [["Service", ...Object.keys(metric.dimensions ?? {})]],
          Metrics: [{ Name: metric.name, Unit: metric.unit }],
        },
      ],
    },
    Service: metric.service,
    ...(metric.dimensions ?? {}),
    [metric.name]: metric.value,
  });
}

/**
 * Returns required allocation/compliance tags missing from a resource.
 *
 * Example: nightly AWS Config rule marks resources non-compliant when `Owner` or `CostCenter` is absent.
 */
export function validateRequiredTags(resource: TaggedResource): string[] {
  return REQUIRED_TAGS.filter((tag) => !resource.tags[tag]);
}

/**
 * Groups AWS spend by a cost-allocation tag.
 *
 * Example: FinOps report groups Lambda, DynamoDB, and S3 cost by `Project` to find untagged shared spend.
 */
export function groupCostByTag(items: CostLineItem[], tag: string): Record<string, number> {
  return items.reduce<Record<string, number>>((acc, item) => {
    const key = item.tags[tag] ?? "<untagged>";
    acc[key] = Number(((acc[key] ?? 0) + item.amountUsd).toFixed(2));
    return acc;
  }, {});
}

/**
 * Forecasts month-end cost from observed daily costs.
 *
 * Example: after seven days of Cost Explorer data, forecast end-of-month burn for budget alerts.
 */
export function forecastMonthlyCost(dailyCosts: number[], daysInMonth = 30): number {
  if (!dailyCosts.length) return 0;
  const average = dailyCosts.reduce((sum, value) => sum + value, 0) / dailyCosts.length;
  return Number((average * daysInMonth).toFixed(2));
}

/**
 * Summarizes backup protection coverage.
 *
 * Example: command center lists unprotected RDS tables and S3 buckets before compliance audit.
 */
export function backupCompliance(resources: BackupPlanResource[]): { protected: number; unprotected: string[] } {
  return {
    protected: resources.filter((resource) => resource.protected).length,
    unprotected: resources.filter((resource) => !resource.protected).map((resource) => resource.arn),
  };
}

/**
 * Detects resource drift by comparing expected and observed required tags.
 *
 * Example: daily governance job creates ticket for prod resource whose `CostCenter` changed outside IaC.
 */
export function tagDriftReport(expected: TaggedResource[], observed: TaggedResource[]): Array<{ arn: string; driftedTags: string[] }> {
  const observedByArn = new Map(observed.map((resource) => [resource.arn, resource]));
  return expected
    .map((resource) => {
      const actual = observedByArn.get(resource.arn);
      const driftedTags = REQUIRED_TAGS.filter((tag) => resource.tags[tag] !== actual?.tags[tag]);
      return { arn: resource.arn, driftedTags };
    })
    .filter((report) => report.driftedTags.length > 0);
}

/**
 * Calculates percentage variance between forecast and budget.
 *
 * Example: budget alert fires when forecast is 15% over monthly budget.
 */
export function budgetVariancePercent(forecastUsd: number, budgetUsd: number): number {
  if (budgetUsd <= 0) return forecastUsd > 0 ? Number.POSITIVE_INFINITY : 0;
  return Number((((forecastUsd - budgetUsd) / budgetUsd) * 100).toFixed(2));
}

/**
 * Recommends simple cost-optimization action from tag and budget signals.
 *
 * Example: if spend is over budget and resources are untagged, FinOps priority is tag cleanup before rightsizing.
 */
export function costOptimizationRecommendation(input: {
  forecastUsd: number;
  budgetUsd: number;
  untaggedCostUsd: number;
}): string {
  const variance = budgetVariancePercent(input.forecastUsd, input.budgetUsd);
  if (input.untaggedCostUsd > 0) return `Tag ${input.untaggedCostUsd.toFixed(2)} USD of unallocated spend before chargeback.`;
  if (variance > 10) return `Forecast is ${variance}% over budget; review top services and rightsizing opportunities.`;
  if (variance < -20) return `Forecast is ${Math.abs(variance)}% under budget; consider lowering commitment or budget.`;
  return "Spend within expected range; continue monitoring daily anomalies.";
}

/**
 * Builds disaster-recovery posture summary for protected critical resources.
 *
 * Example: enterprise dashboard shows high-criticality resources lacking backup as immediate compliance risk.
 */
export function disasterRecoveryPosture(resources: BackupPlanResource[]): { criticalUnprotected: string[]; coveragePercent: number } {
  const protectedCount = resources.filter((resource) => resource.protected).length;
  return {
    criticalUnprotected: resources.filter((resource) => resource.criticality === "high" && !resource.protected).map((resource) => resource.arn),
    coveragePercent: resources.length ? Number(((protectedCount / resources.length) * 100).toFixed(2)) : 100,
  };
}
