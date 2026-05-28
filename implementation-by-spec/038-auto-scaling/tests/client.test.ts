import { describe, it, expect, beforeAll } from "vitest";
import { waitForFloci } from "@floci-lab/test-utils";
import { client } from "../src/client.js";
import { capacity } from "../src/use-cases/groups.js";
describe("Auto Scaling",()=>{beforeAll(async()=>waitForFloci()); it("client configured",()=>expect(client).toBeDefined()); it("models capacity",()=>expect(capacity(1,2,3).desired).toBe(2));});
