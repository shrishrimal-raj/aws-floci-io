import { describe, it, expect, beforeAll, vi } from "vitest";
import type { ACMClient } from "@aws-sdk/client-acm";
import { waitForFloci } from "@floci-lab/test-utils";
import { client } from "../src/client.js";
import type { ACMError } from "../src/errors.js";
import { describeCertificate, requestDnsCertificate, wildcard } from "../src/use-cases/certificates.js";

function failingClient(name: string): ACMClient {
  return { send: vi.fn(async () => { const error = new Error(`${name} failed`); error.name = name; throw error; }) } as unknown as ACMClient;
}

describe("ACM", () => {
  beforeAll(async () => waitForFloci());
  it("client is configured against Floci", () => expect(client).toBeDefined());
  it("builds wildcard domains", () => {
    expect(wildcard("example.com")).toBe("*.example.com");
    expect(wildcard("*.example.com")).toBe("*.example.com");
  });
  it("wraps request failures in ACMError", async () => {
    await expect(requestDnsCertificate("example.com", [], failingClient("AccessDeniedException"))).rejects.toMatchObject({
      code: "ACM_AccessDeniedException",
      message: "ACM requestDnsCertificate failed",
    } satisfies Partial<ACMError>);
  });
  it("wraps describe failures in ACMError", async () => {
    await expect(describeCertificate("arn", failingClient("ResourceNotFoundException"))).rejects.toMatchObject({
      code: "ACM_ResourceNotFoundException",
      message: "ACM describeCertificate failed",
    } satisfies Partial<ACMError>);
  });
});
