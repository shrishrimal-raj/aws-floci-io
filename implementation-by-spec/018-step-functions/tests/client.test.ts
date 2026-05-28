import { describe, it, expect, beforeAll } from "vitest";
import { waitForFloci } from "@floci-lab/test-utils";
import { client } from "../src/client.js";
import { passStateMachine } from "../src/use-cases/workflows.js";
describe("Step Functions",()=>{beforeAll(async()=>waitForFloci()); it("client is configured against Floci",()=>expect(client).toBeDefined()); it("builds ASL",()=>expect(JSON.parse(passStateMachine()).States.Done.Type).toBe("Pass"));});
