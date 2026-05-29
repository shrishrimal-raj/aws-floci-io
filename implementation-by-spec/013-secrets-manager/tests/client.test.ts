import { describe, it, expect, beforeAll, vi } from "vitest";
import type { SecretsManagerClient } from "@aws-sdk/client-secrets-manager";
import { waitForFloci } from "@floci-lab/test-utils";
import { client } from "../src/client.js";
import type { SecretsManagerError } from "../src/errors.js";
import { createJsonSecret, getSecretString, redactSecret, secretVersion } from "../src/use-cases/secrets.js";

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
  beforeAll(async () => {
    await waitForFloci();
  });

  it("client is configured against Floci", () => {
    expect(client).toBeDefined();
  });

  it("redacts secrets for logs", () => {
    expect(redactSecret({ password: "x" }).password).toBe("***REDACTED***");
    expect(secretVersion("db", { ok: true }, "v1")).toMatchObject({ name: "db", versionId: "v1" });
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
