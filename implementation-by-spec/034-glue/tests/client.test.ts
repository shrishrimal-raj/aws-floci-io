import { describe, it, expect, beforeAll } from "vitest";
import { waitForFloci } from "@floci-lab/test-utils";
import { client } from "../src/client.js";
import { s3TableLocation } from "../src/use-cases/catalog.js";
describe("Glue",()=>{beforeAll(async()=>waitForFloci()); it("client configured",()=>expect(client).toBeDefined()); it("builds S3 table locations",()=>expect(s3TableLocation("b","/p/")).toBe("s3://b/p/"));});
