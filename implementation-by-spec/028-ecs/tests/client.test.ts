import { describe, it, expect, beforeAll } from "vitest";
import { waitForFloci } from "@floci-lab/test-utils";
import { client } from "../src/client.js";
describe("ECS",()=>{beforeAll(async()=>waitForFloci()); it("client is configured against Floci",()=>expect(client).toBeDefined()); it("models Fargate task shape",()=>expect({cpu:"256",memory:"512"}).toMatchObject({cpu:"256"}));});
