import { describe, it, expect, beforeAll, vi } from "vitest";
import type { STSClient } from "@aws-sdk/client-sts";
import { waitForFloci } from "@floci-lab/test-utils";
import { client } from "../src/client.js";
import type { STSError } from "../src/errors.js";
import { assertCredentialsFresh, assumeRole, credentialsExpireSoon, getCallerIdentity, summarizeCredentials } from "../src/use-cases/credentials.js";

function failingClient(name: string): STSClient {
  return {
    send: vi.fn(async () => {
      const error = new Error(`${name} failed`);
      error.name = name;
      throw error;
    }),
  } as unknown as STSClient;
}

describe("STS", () => {
  beforeAll(async () => {
    await waitForFloci();
  });

  it("client is configured against Floci", () => {
    expect(client).toBeDefined();
  });

  it("detects soon-expiring credentials", () => {
    expect(credentialsExpireSoon({ Expiration: new Date(Date.now() + 1) })).toBe(true);
    expect(credentialsExpireSoon({ Expiration: new Date(Date.now() + 900_000) })).toBe(false);
  });

  it("summarizes credentials without secrets and asserts freshness", () => {
    const creds = { AccessKeyId: "ASIAX", SecretAccessKey: "secret", SessionToken: "token", Expiration: new Date(Date.now() + 900_000) };
    expect(summarizeCredentials(creds)).toMatchObject({ accessKeyId: "ASIAX", expiresSoon: false });
    expect(() => assertCredentialsFresh(creds)).not.toThrow();
  });

  it("wraps caller identity failures in STSError", async () => {
    await expect(getCallerIdentity(failingClient("AccessDenied"))).rejects.toMatchObject({
      code: "STS_AccessDenied",
      message: "STS getCallerIdentity failed",
    } satisfies Partial<STSError>);
  });

  it("wraps assume role failures in STSError", async () => {
    await expect(assumeRole("arn", "session", 900, failingClient("MalformedPolicyDocument"))).rejects.toMatchObject({
      code: "STS_MalformedPolicyDocument",
      message: "STS assumeRole failed",
    } satisfies Partial<STSError>);
  });
});
