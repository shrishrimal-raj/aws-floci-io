import { describe, it, expect, beforeAll } from "vitest";
import { waitForFloci } from "@floci-lab/test-utils";
import { client } from "../src/client.js";
import { decodeJwtPayload } from "../src/use-cases/user-pools.js";

describe("Cognito", () => {
  beforeAll(async()=>{ await waitForFloci(); });
  it("client is configured against Floci",()=> expect(client).toBeDefined());
  it("decodes JWT payloads",()=>{
    const payload = Buffer.from(JSON.stringify({ sub:"u1" })).toString("base64url");
    expect(decodeJwtPayload(`x.${payload}.y`).sub).toBe("u1");
  });
});
