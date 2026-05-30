import { describe, it, expect, vi } from "vitest";
import type { SecretsManagerClient } from "@aws-sdk/client-secrets-manager";
import { client } from "../src/client.js";
import type { SecretsManagerError } from "../src/errors.js";
import {
  assertSecretNameAllowed,
  createJsonSecret,
  estimateSecretsManagerMonthlyCost,
  getSecretString,
  redactSecret,
  redactSecretDeep,
  secretAuditEvent,
  secretLifecycleDecision,
  secretVersion,
  withSecretRetry,
} from "../src/use-cases/secrets.js";

function failingClient(name: string): SecretsManagerClient {
  return {
    send: vi.fn(async () => {
      const error = new Error(`${name} failed`);
      error.name = name;
      throw error;
    }),
  } as unknown as SecretsManagerClient;
}

describe("Secrets Manager", () => {
  it("client is configured against Floci", () => {
    expect(client).toBeDefined();
  });

  it("redacts secrets for logs", () => {
    expect(redactSecret({ password: "x" }).password).toBe("***REDACTED***");
    expect(redactSecretDeep({ nested: { password: "x" } })).toEqual({ nested: "***REDACTED***" });
    expect(secretVersion("db", { ok: true }, "v1")).toMatchObject({ name: "db", versionId: "v1" });
  });

  it("builds audit, access, lifecycle, and cost helpers", () => {
    expect(secretAuditEvent({ secretId: "prod/a", actor: "api", action: "read", outcome: "success" }, new Date("2026-01-01T00:00:00.000Z"))).toMatchObject({ at: "2026-01-01T00:00:00.000Z" });
    expect(() => assertSecretNameAllowed("prod/tenant-a/db", "prod/tenant-a/")).not.toThrow();
    expect(() => assertSecretNameAllowed("prod/tenant-b/db", "prod/tenant-a/")).toThrow("outside allowed prefix");
    expect(secretLifecycleDecision({ lastChangedDate: new Date("2026-01-01"), lastAccessedDate: new Date("2025-01-01") }, { rotateAfterDays: 90, deleteIfUnusedAfterDays: 365 }, new Date("2026-05-30"))).toEqual({ rotate: true, scheduleDeletion: true, alreadyDeleted: false });
    expect(estimateSecretsManagerMonthlyCost(10, 20_000)).toBe(4.1);
  });

  it("retries transient throttling", async () => {
    vi.useFakeTimers();
    let attempts = 0;
    const result = withSecretRetry(async () => {
      attempts += 1;
      if (attempts === 1) {
        const error = new Error("throttle");
        error.name = "ThrottlingException";
        throw error;
      }
      return "ok";
    }, 2, 1);
    await vi.runAllTimersAsync();
    await expect(result).resolves.toBe("ok");
    vi.useRealTimers();
  });

  it("wraps create failures in SecretsManagerError", async () => {
    await expect(createJsonSecret("x", {}, failingClient("AccessDeniedException"))).rejects.toMatchObject({
      code: "SECRETS_MANAGER_AccessDeniedException",
      message: "Secrets Manager createJsonSecret failed",
    } satisfies Partial<SecretsManagerError>);
  });

  it("wraps read failures in SecretsManagerError", async () => {
    await expect(getSecretString("x", failingClient("ResourceNotFoundException"))).rejects.toMatchObject({
      code: "SECRETS_MANAGER_ResourceNotFoundException",
      message: "Secrets Manager getSecretString failed",
    } satisfies Partial<SecretsManagerError>);
  });
});
