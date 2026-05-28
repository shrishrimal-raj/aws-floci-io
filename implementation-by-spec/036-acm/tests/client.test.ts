import { describe, it, expect, beforeAll } from "vitest";
import { waitForFloci } from "@floci-lab/test-utils";
import { client } from "../src/client.js";
import { wildcard } from "../src/use-cases/certificates.js";
describe("ACM",()=>{beforeAll(async()=>waitForFloci()); it("client configured",()=>expect(client).toBeDefined()); it("builds wildcard domains",()=>expect(wildcard("example.com")).toBe("*.example.com"));});
