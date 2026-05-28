import { describe, it, expect, beforeAll } from "vitest";
import { waitForFloci } from "@floci-lab/test-utils";
import { client } from "../src/client.js";
import { retentionRule } from "../src/use-cases/plans.js";
describe("AWS Backup",()=>{beforeAll(async()=>waitForFloci()); it("client configured",()=>expect(client).toBeDefined()); it("models retention",()=>expect(retentionRule(35).Lifecycle.DeleteAfterDays).toBe(35));});
