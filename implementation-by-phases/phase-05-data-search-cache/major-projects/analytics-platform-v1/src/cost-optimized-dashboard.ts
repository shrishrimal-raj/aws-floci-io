import { DashboardCache, buildPartitionedDashboardSql, instrumentAsync, retryWithBackoff, type CacheClient, type MetricsSink } from "../../../src/index.js";

class MemoryCache implements CacheClient {
  private readonly values = new Map<string, string>();
  async get(key: string) { return this.values.get(key) ?? null; }
  async set(key: string, value: string) { this.values.set(key, value); return "OK" as const; }
  async del(key: string) { return this.values.delete(key) ? 1 : 0; }
}

const metrics: MetricsSink = {
  async putMetric(name, value, dimensions) {
    console.log("metric", name, value, dimensions);
  },
};

/**
 * Real-world use case: executive dashboard backed by Athena.
 * Pattern: partition-safe SQL -> retry query start -> Redis result cache -> latency metrics.
 */
export async function loadExecutiveCheckoutDashboard(): Promise<{ total_events: number }> {
  const dashboard = new DashboardCache(new MemoryCache(), 60);
  const key = { tenantId: "tenant-a", dashboardId: "exec-checkout", from: "2026-05-28", to: "2026-05-28" };

  return instrumentAsync(
    "DashboardQuery",
    metrics,
    () =>
      dashboard.getOrCompute(key, async () => {
        const sql = buildPartitionedDashboardSql({
          tableName: "events",
          tenantId: "tenant-a",
          eventType: "checkout",
          partition: { tenantId: "tenant-a", year: "2026", month: "05", day: "28" },
        });
        await retryWithBackoff(async () => console.log("start Athena SQL", sql.replace(/\n/g, " ")), { retries: 1, sleep: async () => undefined });
        return { total_events: 42 };
      }),
    { tenantId: key.tenantId, dashboardId: key.dashboardId }
  );
}
