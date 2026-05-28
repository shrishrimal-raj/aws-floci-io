import { describe, it, expect, beforeAll } from "vitest";
import { waitForFloci } from "@floci-lab/test-utils";
import { client } from "../src/client.js";
import { requiredTagsRule } from "../src/use-cases/compliance.js";
describe("AWS Config",()=>{beforeAll(async()=>waitForFloci()); it("client configured",()=>expect(client).toBeDefined()); it("builds tag rules",()=>expect(requiredTagsRule(["Service","Env"]).ConfigRuleName).toBe("required-tags"));});
