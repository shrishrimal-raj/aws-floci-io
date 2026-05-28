import { describe, expect, it } from "vitest";
import { DashboardCache, dashboardCacheKey } from "../src/dashboard-cache.js";
import { createDataClients } from "../src/data-clients.js";
import type { CacheClient } from "../src/postgres-cache.js";

class MemoryCache implements CacheClient {
  values = new Map<string, string>();
  async get(key: string) { return this.values.get(key) ?? null; }
  async set(key: string, value: string) { this.values.set(key, value); return "OK" as const; }
}

describe("dashboard cache and data clients", () => {
  it("creates Phase 05 AWS clients", () => {
    const clients = createDataClients({ endpoint: "http://localhost:4566" });
    expect(clients.rds.constructor.name).toBe("RDSClient");
    expect(clients.elasticache.constructor.name).toBe("ElastiCacheClient");
    expect(clients.opensearch.constructor.name).toBe("OpenSearchClient");
    expect(clients.athena.constructor.name).toBe("AthenaClient");
    expect(clients.glue.constructor.name).toBe("GlueClient");
  });

  it("caches dashboard query results by tenant and date range", async () => {
    const key = { tenantId: "t", dashboardId: "sales", from: "2026-05-01", to: "2026-05-28" };
    expect(dashboardCacheKey(key)).toContain("tenant:t:dashboard:sales");
    let calls = 0;
    const cache = new DashboardCache(new MemoryCache());
    await cache.getOrCompute(key, async () => { calls++; return { total: 10 }; });
    await cache.getOrCompute(key, async () => { calls++; return { total: 20 }; });
    expect(calls).toBe(1);
  });
});
