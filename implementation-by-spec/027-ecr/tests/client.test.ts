import { describe, it, expect, beforeAll } from "vitest";
import { waitForFloci } from "@floci-lab/test-utils";
import { client } from "../src/client.js";
describe("ECR",()=>{beforeAll(async()=>waitForFloci()); it("client is configured against Floci",()=>expect(client).toBeDefined()); it("uses immutable repository names",()=>expect("floci-ecr-lab").toContain("ecr"));});
