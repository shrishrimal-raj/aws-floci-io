import { describe, it, expect, beforeAll } from "vitest";
import { waitForFloci } from "@floci-lab/test-utils";
import { client } from "../src/client.js";
import { parsePriceListItem } from "../src/use-cases/prices.js";
describe("Pricing API",()=>{beforeAll(async()=>waitForFloci()); it("client configured",()=>expect(client).toBeDefined()); it("parses price list items",()=>expect(parsePriceListItem('{"x":1}').x).toBe(1));});
