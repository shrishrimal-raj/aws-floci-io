import { describe, it, expect, beforeAll } from "vitest";
import { waitForFloci } from "@floci-lab/test-utils";
import { client } from "../src/client.js";
import { s3Home } from "../src/use-cases/servers.js";
describe("Transfer Family",()=>{beforeAll(async()=>waitForFloci()); it("client configured",()=>expect(client).toBeDefined()); it("builds S3 home",()=>expect(s3Home("bucket","/home/u")).toBe("/bucket/home/u"));});
