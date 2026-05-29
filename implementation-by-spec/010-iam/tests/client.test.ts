import { describe, it, expect, beforeAll, vi } from "vitest";
import type { IAMClient } from "@aws-sdk/client-iam";
import { waitForFloci } from "@floci-lab/test-utils";
import { client } from "../src/client.js";
import type { IAMError } from "../src/errors.js";
import { attachPolicy, createPolicy, multiStatementPolicy, policyDocument } from "../src/use-cases/access.js";

function failingClient(name: string): IAMClient {
  return {
    send: vi.fn(async () => {
      const error = new Error(`${name} failed`);
      error.name = name;
      throw error;
    }),
  } as unknown as IAMClient;
}

describe("IAM", () => {
  beforeAll(async () => {
    await waitForFloci();
  });

  it("client is configured against Floci", () => {
    expect(client).toBeDefined();
  });

  it("builds least-privilege policy documents", () => {
    expect(policyDocument(["s3:GetObject"], ["arn"])).toContain("s3:GetObject");
    const multi = JSON.parse(multiStatementPolicy([{ actions: ["s3:GetObject"], resources: ["arn"] }]));
    expect(multi.Statement[0].Resource).toEqual(["arn"]);
  });

  it("wraps SDK policy failures in IAMError", async () => {
    await expect(createPolicy("x", "{}", failingClient("AccessDenied"))).rejects.toMatchObject({
      code: "IAM_AccessDenied",
      message: "IAM createPolicy failed",
    } satisfies Partial<IAMError>);
  });

  it("wraps SDK attach failures in IAMError", async () => {
    await expect(attachPolicy("role", "arn", failingClient("NoSuchEntity"))).rejects.toMatchObject({
      code: "IAM_NoSuchEntity",
      message: "IAM attachPolicy failed",
    } satisfies Partial<IAMError>);
  });
});
