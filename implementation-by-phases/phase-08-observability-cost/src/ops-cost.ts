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

export const REQUIRED_TAGS = ["Environment", "Owner", "CostCenter", "Project"] as const;

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

export function validateRequiredTags(resource: TaggedResource): string[] {
  return REQUIRED_TAGS.filter((tag) => !resource.tags[tag]);
}

export function groupCostByTag(items: CostLineItem[], tag: string): Record<string, number> {
  return items.reduce<Record<string, number>>((acc, item) => {
    const key = item.tags[tag] ?? "<untagged>";
    acc[key] = Number(((acc[key] ?? 0) + item.amountUsd).toFixed(2));
    return acc;
  }, {});
}

export function forecastMonthlyCost(dailyCosts: number[], daysInMonth = 30): number {
  if (!dailyCosts.length) return 0;
  const average = dailyCosts.reduce((sum, value) => sum + value, 0) / dailyCosts.length;
  return Number((average * daysInMonth).toFixed(2));
}

export function backupCompliance(resources: Array<{ arn: string; protected: boolean }>): { protected: number; unprotected: string[] } {
  return {
    protected: resources.filter((resource) => resource.protected).length,
    unprotected: resources.filter((resource) => !resource.protected).map((resource) => resource.arn),
  };
}
