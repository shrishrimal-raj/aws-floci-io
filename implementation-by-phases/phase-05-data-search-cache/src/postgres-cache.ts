export interface QueryRunner<T = unknown> {
  query(sql: string, params?: unknown[]): Promise<{ rows: T[] }>;
}

export interface CacheClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, options?: { ttlSeconds?: number; nx?: boolean }): Promise<"OK" | null>;
  del?(key: string): Promise<number>;
}

export interface ProductRow {
  product_id: string;
  tenant_id: string;
  name: string;
  price_cents: number;
  updated_at: string;
}

export function productSchemaSql(): string {
  return `
CREATE TABLE IF NOT EXISTS products (
  tenant_id text NOT NULL,
  product_id text NOT NULL,
  name text NOT NULL,
  description text,
  price_cents integer NOT NULL CHECK (price_cents >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, product_id)
);
CREATE INDEX IF NOT EXISTS products_tenant_updated_idx ON products (tenant_id, updated_at DESC);
`;
}

export function tenantCacheKey(tenantId: string, namespace: string, id: string): string {
  return `tenant:${tenantId}:${namespace}:${id}`;
}

export function jitterTtl(baseSeconds: number, jitterRatio = 0.1, random = Math.random): number {
  const jitter = Math.round(baseSeconds * jitterRatio * random());
  return baseSeconds + jitter;
}

export class SingleFlight {
  private readonly inflight = new Map<string, Promise<unknown>>();

  async run<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const existing = this.inflight.get(key) as Promise<T> | undefined;
    if (existing) return existing;
    const promise = fn().finally(() => this.inflight.delete(key));
    this.inflight.set(key, promise);
    return promise;
  }
}

export class ProductRepository {
  constructor(private readonly db: QueryRunner<ProductRow>) {}

  async get(tenantId: string, productId: string): Promise<ProductRow | undefined> {
    const result = await this.db.query(
      "SELECT product_id, tenant_id, name, price_cents, updated_at FROM products WHERE tenant_id = $1 AND product_id = $2",
      [tenantId, productId]
    );
    return result.rows[0];
  }
}

export class CachedProductRepository {
  private readonly singleFlight = new SingleFlight();

  constructor(
    private readonly repo: ProductRepository,
    private readonly cache: CacheClient,
    private readonly ttlSeconds = 300
  ) {}

  async get(tenantId: string, productId: string): Promise<ProductRow | undefined> {
    const key = tenantCacheKey(tenantId, "product", productId);
    const cached = await this.cache.get(key);
    if (cached) return JSON.parse(cached) as ProductRow;

    return this.singleFlight.run(key, async () => {
      const secondCheck = await this.cache.get(key);
      if (secondCheck) return JSON.parse(secondCheck) as ProductRow;
      const product = await this.repo.get(tenantId, productId);
      if (product) await this.cache.set(key, JSON.stringify(product), { ttlSeconds: jitterTtl(this.ttlSeconds) });
      return product;
    });
  }
}
