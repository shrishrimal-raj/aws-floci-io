import { describe, expect, it } from "vitest";
import { CachedProductRepository, ProductRepository, jitterTtl, productSchemaSql, tenantCacheKey, type CacheClient, type ProductRow, type QueryRunner } from "../src/postgres-cache.js";

class MemoryCache implements CacheClient {
  values = new Map<string, string>();
  async get(key: string) { return this.values.get(key) ?? null; }
  async set(key: string, value: string) { this.values.set(key, value); return "OK" as const; }
}

const product: ProductRow = { tenant_id: "tenant-a", product_id: "p1", name: "Boots", price_cents: 9900, updated_at: "now" };

describe("Postgres + Redis read-through cache", () => {
  it("defines relational product schema", () => {
    expect(productSchemaSql()).toContain("PRIMARY KEY (tenant_id, product_id)");
    expect(productSchemaSql()).toContain("products_tenant_updated_idx");
  });

  it("creates tenant-safe cache keys and jitter TTL", () => {
    expect(tenantCacheKey("tenant-a", "product", "p1")).toBe("tenant:tenant-a:product:p1");
    expect(jitterTtl(100, 0.1, () => 1)).toBe(110);
  });

  it("loads product once then serves from cache", async () => {
    let calls = 0;
    const db: QueryRunner<ProductRow> = { async query() { calls++; return { rows: [product] }; } };
    const cache = new MemoryCache();
    const repo = new CachedProductRepository(new ProductRepository(db), cache);
    await expect(repo.get("tenant-a", "p1")).resolves.toEqual(product);
    await expect(repo.get("tenant-a", "p1")).resolves.toEqual(product);
    expect(calls).toBe(1);
  });
});
