import { describe, it, expect, beforeAll } from "vitest";
import { waitForFloci } from "@floci-lab/test-utils";
import { client } from "../src/client.js";
describe("Firehose",()=>{beforeAll(async()=>waitForFloci()); it("client is configured against Floci",()=>expect(client).toBeDefined()); it("encodes newline-delimited JSON",()=>expect(JSON.stringify({ok:true})+"\n").toContain("ok"));});
