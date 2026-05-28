import { describe, it, expect, beforeAll } from "vitest";
import { waitForFloci } from "@floci-lab/test-utils";
import { client } from "../src/client.js";
import { structuredLog } from "../src/use-cases/logs.js";
describe("CloudWatch Logs",()=>{beforeAll(async()=>waitForFloci()); it("client is configured against Floci",()=>expect(client).toBeDefined()); it("builds structured logs",()=>expect(structuredLog("info","ok").level).toBe("info"));});
