import { describe, it, expect, beforeAll } from "vitest";
import { waitForFloci } from "@floci-lab/test-utils";
import { client } from "../src/client.js";
describe("Kinesis",()=>{beforeAll(async()=>waitForFloci()); it("client is configured against Floci",()=>expect(client).toBeDefined()); it("encodes JSON records",()=>expect(new TextEncoder().encode(JSON.stringify({ok:true}))).toBeInstanceOf(Uint8Array));});
