import { describe, it, expect, beforeAll } from "vitest";
import { waitForFloci } from "@floci-lab/test-utils";
import { client } from "../src/client.js";
import { listenerRulePath } from "../src/use-cases/load-balancers.js";
describe("ELB v2",()=>{beforeAll(async()=>waitForFloci()); it("client configured",()=>expect(client).toBeDefined()); it("builds path rules",()=>expect(listenerRulePath("/api/*").Field).toBe("path-pattern"));});
