import { backupPlan, complianceTags, dataLifecycleRule, eventLakePrefix, invalidateCache, productInvalidationKeys, type BusinessEvent, type CacheClient } from "../../../src/index.js";

class MemoryCache implements CacheClient {
  private readonly values = new Map<string, string>();
  async get(key: string) { return this.values.get(key) ?? null; }
  async set(key: string, value: string) { this.values.set(key, value); return "OK" as const; }
  async del(key: string) { return this.values.delete(key) ? 1 : 0; }
}

/**
 * Real-world use case: regulated data lake onboarding.
 * Pattern: event partitioning, lifecycle retention, resource tags, DR backup target, cache invalidation.
 */
export async function provisionRegulatedTenantDataControls(): Promise<Record<string, unknown>> {
  const event: BusinessEvent = {
    eventId: "evt-1",
    tenantId: "tenant-a",
    eventType: "checkout",
    occurredAt: "2026-05-28T10:30:00.000Z",
    payload: { orderId: "o-1", amount: 12900 },
  };

  const cache = new MemoryCache();
  await cache.set("tenant:tenant-a:product:boot-1", JSON.stringify({ product_id: "boot-1" }));
  const removed = await invalidateCache(cache, productInvalidationKeys("tenant-a", "boot-1", ["exec-checkout"]));

  return {
    bronzePrefix: eventLakePrefix("bronze", event),
    lifecycle: dataLifecycleRule("bronze/", 400),
    tags: complianceTags({ owner: "data-platform", dataClassification: "restricted", retentionDays: 400, costCenter: "FIN-001" }),
    backup: backupPlan({ resource: "rds:catalog-prod", rpoMinutes: 5, rtoMinutes: 30, copyToRegion: "us-west-2" }),
    cacheKeysRemoved: removed,
  };
}
