import { describe, it, expect, beforeAll } from "vitest";
import { waitForFloci } from "@floci-lab/test-utils";
import { client } from "../src/client.js";
import { extractLines } from "../src/use-cases/documents.js";
describe("Textract",()=>{beforeAll(async()=>waitForFloci()); it("client configured",()=>expect(client).toBeDefined()); it("extracts line text",()=>expect(extractLines([{BlockType:"LINE",Text:"x"}])).toEqual(["x"]));});
