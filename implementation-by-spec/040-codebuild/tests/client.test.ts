import { describe, it, expect, beforeAll } from "vitest";
import { waitForFloci } from "@floci-lab/test-utils";
import { client } from "../src/client.js";
import { buildspec } from "../src/use-cases/builds.js";
describe("CodeBuild",()=>{beforeAll(async()=>waitForFloci()); it("client configured",()=>expect(client).toBeDefined()); it("builds buildspec",()=>expect(buildspec(["npm test"])).toContain("npm test"));});
