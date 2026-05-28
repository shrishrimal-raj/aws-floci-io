import { describe, it, expect, beforeAll } from "vitest";
import { waitForFloci } from "@floci-lab/test-utils";
import { client } from "../src/client.js";
import { userData } from "../src/use-cases/instances.js";
describe("EC2",()=>{beforeAll(async()=>waitForFloci()); it("client is configured against Floci",()=>expect(client).toBeDefined()); it("base64 encodes user data",()=>expect(userData("echo hi")).toBe(Buffer.from("echo hi").toString("base64")));});
