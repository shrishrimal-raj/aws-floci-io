import { describe, it, expect, beforeAll } from "vitest";
import { waitForFloci } from "@floci-lab/test-utils";
import { client } from "../src/client.js";
import { redactSecret } from "../src/use-cases/secrets.js";

describe("Secrets Manager", () => {
  beforeAll(async()=>{ await waitForFloci(); });
  it("client is configured against Floci",()=> expect(client).toBeDefined());
  it("redacts secrets for logs",()=> expect(redactSecret({password:"x"}).password).toBe("***REDACTED***"));
});
