import { describe, it, expect, beforeAll } from "vitest";
import { waitForFloci } from "@floci-lab/test-utils";
import { client } from "../src/client.js";
import { claudeMessagesBody } from "../src/use-cases/models.js";
describe("Bedrock Runtime",()=>{beforeAll(async()=>waitForFloci()); it("client configured",()=>expect(client).toBeDefined()); it("builds Claude body",()=>expect(claudeMessagesBody("hi").messages[0]!.role).toBe("user"));});
