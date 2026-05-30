import { describe, expect, it } from "vitest";
import {
  assertTenantAccess,
  backupPlan,
  buildPartitionedDashboardSql,
  complianceTags,
  dataLifecycleRule,
  eventLakePrefix,
  instrumentAsync,
  invalidateCache,
  productInvalidationKeys,
  retryWithBackoff,
  sqlLiteral,
  withAuditLog,
  type AuditEvent,
} from "../src/enterprise-patterns.js";
import type { CacheClient } from "../src/postgres-cache.js";

class MemoryCache implements CacheClient {
  values = new Map<string, string>();
  async get(key: string) { return this.values.get(key) ?? null; }
  async set(key: string, value: string) { this.values.set(key, value); return "OK" as const; }
  async del(key: string) { return this.values.delete(key) ? 1 : 0; }
}

describe("enterprise data/search/cache patterns", () => {
  it("enforces tenant and role access", () => {
    expect(() => assertTenantAccess({ actorId: "u1", tenantId: "tenant-a", roles: ["reader"] }, "tenant-a")).not.toThrow();
    expect(() => assertTenantAccess({ actorId: "u1", tenantId: "tenant-a", roles: ["reader"] }, "tenant-b")).toThrow("tenant access denied");
    expect(() => assertTenantAccess({ actorId: "u1", tenantId: "tenant-a", roles: ["reader"] }, "tenant-a", "writer")).toThrow("role access denied");
  });

  it("writes audit success and failure events", async () => {
    const events: AuditEvent[] = [];
    const sink = { async write(event: AuditEvent) { events.push(event); } };
    await expect(withAuditLog(sink, { actorId: "u1", tenantId: "tenant-a", action: "read", resource: "p1" }, async () => "ok")).resolves.toBe("ok");
    await expect(withAuditLog(sink, { actorId: "u1", tenantId: "tenant-a", action: "read", resource: "p2" }, async () => { throw new Error("boom"); })).rejects.toThrow("boom");
    expect(events.map((event) => event.outcome)).toEqual(["attempt", "success", "attempt", "failure"]);
  });

  it("retries with backoff and jitter", async () => {
    let calls = 0;
    const delays: number[] = [];
    const result = await retryWithBackoff(
      async () => {
        calls++;
        if (calls < 3) throw new Error("throttle");
        return "ok";
      },
      { retries: 3, baseDelayMs: 10, random: () => 0, sleep: async (ms) => { delays.push(ms); } }
    );
    expect(result).toBe("ok");
    expect(delays).toEqual([10, 20]);
  });

  it("instruments latency and failures", async () => {
    const metrics: string[] = [];
    const sink = { async putMetric(name: string) { metrics.push(name); } };
    await expect(instrumentAsync("Search", sink, async () => 1)).resolves.toBe(1);
    await expect(instrumentAsync("Search", sink, async () => { throw new Error("down"); })).rejects.toThrow("down");
    expect(metrics).toContain("SearchLatencyMs");
    expect(metrics).toContain("SearchFailure");
  });

  it("builds partition-safe SQL and event lake prefixes", () => {
    const partition = { tenantId: "tenant-a", year: "2026", month: "05", day: "28" };
    expect(sqlLiteral("acme's")).toBe("'acme''s'");
    expect(buildPartitionedDashboardSql({ tableName: "events", tenantId: "tenant-a", eventType: "checkout", partition })).toContain("tenant_id = 'tenant-a'");
    expect(eventLakePrefix("bronze", { eventId: "e1", tenantId: "tenant-a", eventType: "checkout", occurredAt: "2026-05-28T10:00:00.000Z", payload: {} })).toBe("bronze/event_type=checkout/tenant_id=tenant-a/year=2026/month=05/day=28/");
  });

  it("invalidates cache and defines lifecycle backup compliance controls", async () => {
    const cache = new MemoryCache();
    await cache.set("tenant:tenant-a:product:p1", "{}");
    expect(productInvalidationKeys("tenant-a", "p1", ["sales"])).toEqual(["tenant:tenant-a:product:p1", "tenant:tenant-a:dashboard:sales:*"]);
    await expect(invalidateCache(cache, ["tenant:tenant-a:product:p1"])).resolves.toBe(1);
    expect(dataLifecycleRule("bronze/", 400)).toMatchObject({ expirationDays: 400, transitionToIaDays: 30 });
    expect(backupPlan({ resource: "rds", rpoMinutes: 5, rtoMinutes: 30 })).toMatchObject({ encrypted: true, pointInTimeRecovery: true });
    expect(complianceTags({ owner: "team", dataClassification: "restricted", retentionDays: 400, costCenter: "fin" })).toMatchObject({ ManagedBy: "phase-05-data-search-cache" });
  });
});
