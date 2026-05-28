import { describe, it, expect, beforeAll } from "vitest";
import { waitForFloci } from "@floci-lab/test-utils";
import { client } from "../src/client.js";
import { sqsToEventBusFilter } from "../src/use-cases/pipes.js";
describe("EventBridge Pipes",()=>{beforeAll(async()=>waitForFloci()); it("client is configured against Floci",()=>expect(client).toBeDefined()); it("builds pipe filters",()=>expect(sqsToEventBusFilter("x").body.eventType).toEqual(["x"]));});
