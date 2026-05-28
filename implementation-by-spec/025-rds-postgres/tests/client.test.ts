import { describe, it, expect, beforeAll } from "vitest";
import { waitForFloci } from "@floci-lab/test-utils";
import { client } from "../src/client.js";
import { connectionString } from "../src/use-cases/databases.js";
describe("RDS Postgres",()=>{beforeAll(async()=>waitForFloci()); it("client is configured against Floci",()=>expect(client).toBeDefined()); it("builds connection strings",()=>expect(connectionString("localhost")).toContain("postgresql://"));});
