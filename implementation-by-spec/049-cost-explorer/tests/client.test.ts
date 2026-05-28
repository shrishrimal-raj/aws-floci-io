import { describe, it, expect, beforeAll } from "vitest";
import { waitForFloci } from "@floci-lab/test-utils";
import { client } from "../src/client.js";
import { monthRange } from "../src/use-cases/costs.js";
describe("Cost Explorer",()=>{beforeAll(async()=>waitForFloci()); it("client configured",()=>expect(client).toBeDefined()); it("builds month ranges",()=>expect(monthRange(new Date("2024-01-15T00:00:00Z")).start).toBe("2024-01-01"));});
