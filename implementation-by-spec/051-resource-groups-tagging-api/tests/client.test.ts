import { describe, it, expect, beforeAll } from "vitest";
import { waitForFloci } from "@floci-lab/test-utils";
import { client } from "../src/client.js";
import { standardTags } from "../src/use-cases/tags.js";
describe("Resource Groups Tagging API",()=>{beforeAll(async()=>waitForFloci()); it("client configured",()=>expect(client).toBeDefined()); it("builds standard tags",()=>expect(standardTags("api").ManagedBy).toBe("floci"));});
