import { describe, it, expect, beforeAll } from "vitest";
import { waitForFloci } from "@floci-lab/test-utils";
import { client } from "../src/client.js";
import { credentialsExpireSoon } from "../src/use-cases/credentials.js";

describe("STS", () => {
  beforeAll(async()=>{ await waitForFloci(); });
  it("client is configured against Floci",()=> expect(client).toBeDefined());
  it("detects soon-expiring credentials",()=> expect(credentialsExpireSoon({Expiration:new Date(Date.now()+1)})).toBe(true));
});
