import { describe, it, expect, vi } from "vitest";
import type { Credentials, STSClient } from "@aws-sdk/client-sts";
import { client } from "../src/client.js";
import type { STSError } from "../src/errors.js";
import {
  assertCredentialsFresh,
  assumeRole,
  buildScopedSessionPolicy,
  createExternalId,
  createStsAuditEvent,
  createStsRetryPlan,
  credentialsExpireSoon,
  getCallerIdentity,
  planCredentialRefresh,
  summarizeCredentials,
  validateRoleSessionName,
} from "../src/use-cases/credentials.js";

function failingClient(name: string): STSClient {
  return {
    send: vi.fn(async () => {
      const error = new Error(`${name} failed`);
      error.name = name;
      throw error;
    }),
  } as unknown as STSClient;
}

function successfulAssumeRoleClient(credentials: Credentials): STSClient {
  return {
    send: vi.fn(async (command: { input?: unknown }) => {
      expect(command.input).toMatchObject({ ExternalId: "tenant-export", SourceIdentity: "worker" });
      return { Credentials: credentials };
    }),
  } as unknown as STSClient;
}

describe("STS", () => {
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
    expect(JSON.stringify(summarizeCredentials(creds))).not.toContain("secret");
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

  it("passes external id, source identity, and scoped policy to AssumeRole", async () => {
    const creds = { AccessKeyId: "ASIA1", SecretAccessKey: "secret", SessionToken: "token", Expiration: new Date(Date.now() + 900_000) };
    const policy = buildScopedSessionPolicy([{ effect: "Allow", actions: ["s3:GetObject"], resources: ["arn:aws:s3:::bucket/tenant/*"] }]);
    await expect(assumeRole("arn:aws:iam::111122223333:role/export", "tenant-export", 900, successfulAssumeRoleClient(creds), { externalId: "tenant-export", sourceIdentity: "worker", sessionPolicy: policy })).resolves.toEqual(creds);
  });

  it("validates role session names", () => {
    expect(validateRoleSessionName("chg-1042-release-bot")).toBe("chg-1042-release-bot");
    expect(() => validateRoleSessionName("x")).toThrow("Role session name must be 2-64 chars");
    expect(() => validateRoleSessionName("bad space")).toThrow("Role session name must be 2-64 chars");
  });

  it("builds scoped least-privilege session policy", () => {
    const policy = JSON.parse(
      buildScopedSessionPolicy([
        {
          effect: "Allow",
          actions: ["dynamodb:Query"],
          resources: ["arn:aws:dynamodb:us-east-1:111122223333:table/orders"],
          conditions: { "ForAllValues:StringEquals": { "aws:TagKeys": ["tenantId"] } },
        },
      ]),
    );
    expect(policy.Statement[0]).toMatchObject({ Effect: "Allow", Action: ["dynamodb:Query"] });
  });

  it("creates external ids and audit events", () => {
    expect(createExternalId("Acme Retail", "Prod Deploy")).toBe("acme-retail-prod-deploy");
    expect(
      createStsAuditEvent({ operation: "AssumeRole", actor: "release-bot", targetArn: "arn", sessionName: "session", outcome: "ALLOW", ticketId: "CHG-1", timestamp: "2026-05-30T00:00:00.000Z" }),
    ).toMatchObject({ service: "sts", operation: "AssumeRole", ticketId: "CHG-1" });
  });

  it("plans credential refresh and STS retries", () => {
    const expiration = new Date(Date.now() + 30 * 60_000);
    expect(planCredentialRefresh({ Expiration: expiration }, { refreshBeforeMs: 5 * 60_000, requiredWorkloadTtlMs: 10 * 60_000 })).toMatchObject({ safeForWorkload: true });
    expect(planCredentialRefresh({ Expiration: undefined }, { requiredWorkloadTtlMs: 10 * 60_000 })).toMatchObject({ safeForWorkload: false, reason: "credentials have no expiration" });
    expect(createStsRetryPlan("conservative")).toMatchObject({ maxAttempts: 6 });
  });
});
