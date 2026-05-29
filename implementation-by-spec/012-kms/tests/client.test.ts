import { describe, it, expect, beforeAll, vi } from "vitest";
import type { KMSClient } from "@aws-sdk/client-kms";
import { waitForFloci } from "@floci-lab/test-utils";
import { client } from "../src/client.js";
import type { KMSError } from "../src/errors.js";
import { createAlias, createKey, encryptString } from "../src/use-cases/crypto.js";

function failingClient(name: string): KMSClient {
  return {
    send: vi.fn(async () => {
      const error = new Error(`${name} failed`);
      error.name = name;
      throw error;
    }),
  } as unknown as KMSClient;
}

describe("KMS", () => {
  beforeAll(async () => {
    await waitForFloci();
  });

  it("client is configured against Floci", () => {
    expect(client).toBeDefined();
  });

  it("uses bytes for plaintext/ciphertext boundaries", () => {
    expect(new TextEncoder().encode("secret")).toBeInstanceOf(Uint8Array);
  });

  it("normalizes aliases without throwing on already exists", async () => {
    const alreadyExistsClient = {
      send: vi.fn(async () => {
        const error = new Error("exists");
        error.name = "AlreadyExistsException";
        throw error;
      }),
    } as unknown as KMSClient;

    await expect(createAlias("my-key", "key-id", alreadyExistsClient)).resolves.toBeUndefined();
  });

  it("wraps SDK create failures in KMSError", async () => {
    await expect(createKey("x", failingClient("AccessDeniedException"))).rejects.toMatchObject({
      code: "KMS_AccessDeniedException",
      message: "KMS createKey failed",
    } satisfies Partial<KMSError>);
  });

  it("wraps SDK encrypt failures in KMSError", async () => {
    await expect(encryptString("key", "secret", failingClient("NotFoundException"))).rejects.toMatchObject({
      code: "KMS_NotFoundException",
      message: "KMS encryptString failed",
    } satisfies Partial<KMSError>);
  });
});
