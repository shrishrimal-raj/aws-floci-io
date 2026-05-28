import { describe, it, expect, beforeAll } from "vitest";
import { waitForFloci } from "@floci-lab/test-utils";
import { client } from "../src/client.js";
import { parameterPath } from "../src/use-cases/parameters.js";
describe("SSM Parameter Store",()=>{beforeAll(async()=>waitForFloci()); it("client is configured against Floci",()=>expect(client).toBeDefined()); it("builds hierarchical paths",()=>expect(parameterPath("app","dev","db/url")).toBe("/app/dev/db/url"));});
