import { describe, it, expect, beforeAll } from "vitest";
import { waitForFloci } from "@floci-lab/test-utils";
import { client } from "../src/client.js";
import { cacheBehavior } from "../src/use-cases/distributions.js";
describe("CloudFront",()=>{beforeAll(async()=>waitForFloci()); it("client configured",()=>expect(client).toBeDefined()); it("builds cache behavior",()=>expect(cacheBehavior("/api/*","origin").TargetOriginId).toBe("origin"));});
