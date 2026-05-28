import { describe, it, expect, beforeAll } from "vitest";
import { waitForFloci } from "@floci-lab/test-utils";
import { client } from "../src/client.js";
import { createExternalTableSql } from "../src/use-cases/queries.js";
describe("Athena",()=>{beforeAll(async()=>waitForFloci()); it("client is configured against Floci",()=>expect(client).toBeDefined()); it("builds external table SQL",()=>expect(createExternalTableSql("t","s3://b/")).toContain("CREATE EXTERNAL TABLE"));});
