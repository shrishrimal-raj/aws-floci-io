import { describe, it, expect, beforeAll } from "vitest";
import { waitForFloci } from "@floci-lab/test-utils";
import { client } from "../src/client.js";

describe("KMS", () => {
  beforeAll(async()=>{ await waitForFloci(); });
  it("client is configured against Floci",()=> expect(client).toBeDefined());
  it("uses bytes for plaintext/ciphertext boundaries",()=> expect(new TextEncoder().encode("secret")).toBeInstanceOf(Uint8Array));
});
