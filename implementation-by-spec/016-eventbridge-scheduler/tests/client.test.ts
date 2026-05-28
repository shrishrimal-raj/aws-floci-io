import { describe, it, expect, beforeAll } from "vitest";
import { waitForFloci } from "@floci-lab/test-utils";
import { client } from "../src/client.js";
import { everyMinutes } from "../src/use-cases/schedules.js";
describe("EventBridge Scheduler",()=>{beforeAll(async()=>waitForFloci()); it("client is configured against Floci",()=>expect(client).toBeDefined()); it("builds rate expressions",()=>expect(everyMinutes(5)).toBe("rate(5 minutes)"));});
