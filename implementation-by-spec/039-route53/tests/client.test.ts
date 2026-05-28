import { describe, it, expect, beforeAll } from "vitest";
import { waitForFloci } from "@floci-lab/test-utils";
import { client } from "../src/client.js";
import { fqdn } from "../src/use-cases/dns.js";
describe("Route53",()=>{beforeAll(async()=>waitForFloci()); it("client configured",()=>expect(client).toBeDefined()); it("builds FQDNs",()=>expect(fqdn("api","example.com")).toBe("api.example.com."));});
