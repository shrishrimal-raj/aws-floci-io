import { tenantCacheKey, type CacheClient } from "./postgres-cache.js";

export interface DashboardQueryKey {
  tenantId: string;
  dashboardId: string;
  from: string;
  to: string;
}

export function dashboardCacheKey(input: DashboardQueryKey): string {
  return tenantCacheKey(input.tenantId, "dashboard", `${input.dashboardId}:${input.from}:${input.to}`);
}

export class DashboardCache {
  constructor(private readonly cache: CacheClient, private readonly ttlSeconds = 60) {}

  async getOrCompute<T>(key: DashboardQueryKey, compute: () => Promise<T>): Promise<T> {
    const cacheKey = dashboardCacheKey(key);
    const cached = await this.cache.get(cacheKey);
    if (cached) return JSON.parse(cached) as T;
    const value = await compute();
    await this.cache.set(cacheKey, JSON.stringify(value), { ttlSeconds: this.ttlSeconds });
    return value;
  }
}
