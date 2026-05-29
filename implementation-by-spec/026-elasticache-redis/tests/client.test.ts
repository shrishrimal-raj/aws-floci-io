import { describe, it, expect, beforeAll, vi } from "vitest";
import type { ElastiCacheClient } from "@aws-sdk/client-elasticache";
import { waitForFloci } from "@floci-lab/test-utils";
import { client } from "../src/client.js";
import type { ElastiCacheRedisError } from "../src/errors.js";
import { createRedisCluster, describeRedisCluster, cacheKey, redisUrl } from "../src/use-cases/redis.js";

function failingClient(name: string): ElastiCacheClient {
  return { send: vi.fn(async () => { const error = new Error(`${name} failed`); error.name = name; throw error; }) } as unknown as ElastiCacheClient;
}

describe("ElastiCache Redis", () => {
  beforeAll(async () => waitForFloci());
  it("client is configured against Floci", () => expect(client).toBeDefined());
  it("supports local pure helpers", () => { expect(cacheKey("app", "dev", "user:1")).toBe("app:dev:user:1"); expect(redisUrl("localhost", 6379, false)).toBe("redis://localhost:6379"); });
  it("wraps primary failures", async () => {
    await expect(createRedisCluster("redis", 1, failingClient("AccessDeniedException"))).rejects.toMatchObject({ code: "ELASTICACHE_REDIS_AccessDeniedException", message: "ElastiCache Redis createRedisCluster failed" } satisfies Partial<ElastiCacheRedisError>);
  });
  it("wraps secondary failures", async () => {
    await expect(describeRedisCluster("redis", failingClient("CacheClusterNotFound"))).rejects.toMatchObject({ code: "ELASTICACHE_REDIS_CacheClusterNotFound", message: "ElastiCache Redis describeRedisCluster failed" } satisfies Partial<ElastiCacheRedisError>);
  });
});
