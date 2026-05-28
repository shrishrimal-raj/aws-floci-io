import { describe, it, expect, beforeAll } from "vitest";
import { waitForFloci } from "@floci-lab/test-utils";
import { client } from "../src/client.js";
import { featureFlags } from "../src/use-cases/config.js";
describe("AppConfig",()=>{beforeAll(async()=>waitForFloci()); it("client configured",()=>expect(client).toBeDefined()); it("builds flags",()=>expect(featureFlags({checkout:true}).flags.checkout).toBe(true));});
