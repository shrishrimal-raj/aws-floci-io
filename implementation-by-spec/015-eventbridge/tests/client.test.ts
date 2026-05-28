import { describe, it, expect, beforeAll } from "vitest";
import { waitForFloci } from "@floci-lab/test-utils";
import { client } from "../src/client.js";
import { eventPattern } from "../src/use-cases/events.js";
describe("EventBridge",()=>{beforeAll(async()=>waitForFloci()); it("client is configured against Floci",()=>expect(client).toBeDefined()); it("builds event patterns",()=>expect(eventPattern("app","created").source).toEqual(["app"]));});
