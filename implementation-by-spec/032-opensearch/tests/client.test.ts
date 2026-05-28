import { describe, it, expect, beforeAll } from "vitest";
import { waitForFloci } from "@floci-lab/test-utils";
import { client } from "../src/client.js";
import { indexMapping } from "../src/use-cases/domains.js";
describe("OpenSearch",()=>{beforeAll(async()=>waitForFloci()); it("client is configured against Floci",()=>expect(client).toBeDefined()); it("builds index mappings",()=>expect(indexMapping({title:"text"}).mappings.properties.title!.type).toBe("text"));});
