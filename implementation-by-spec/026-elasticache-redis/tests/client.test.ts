import { describe, it, expect, beforeAll } from "vitest";
import { waitForFloci } from "@floci-lab/test-utils";
import { client } from "../src/client.js";
import { cacheKey, redisUrl } from "../src/use-cases/redis.js";
describe("ElastiCache Redis",()=>{beforeAll(async()=>waitForFloci()); it("client is configured against Floci",()=>expect(client).toBeDefined()); it("builds redis urls and keys",()=>{expect(redisUrl("localhost")).toContain("rediss://"); expect(cacheKey("app","dev","x")).toBe("app:dev:x");});});
