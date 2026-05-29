import { describe, it, expect, beforeAll, vi } from "vitest";
import type { CognitoIdentityProviderClient } from "@aws-sdk/client-cognito-identity-provider";
import { waitForFloci } from "@floci-lab/test-utils";
import { client } from "../src/client.js";
import type { CognitoError } from "../src/errors.js";
import { adminCreateUser, assertJwtClaims, createUserPool, decodeJwtPayload, isJwtExpired } from "../src/use-cases/user-pools.js";

function failingClient(name: string): CognitoIdentityProviderClient {
  return {
    send: vi.fn(async () => {
      const error = new Error(`${name} failed`);
      error.name = name;
      throw error;
    }),
  } as unknown as CognitoIdentityProviderClient;
}

describe("Cognito", () => {
  beforeAll(async () => {
    await waitForFloci();
  });

  it("client is configured against Floci", () => {
    expect(client).toBeDefined();
  });

  it("decodes and validates JWT payloads", () => {
    const payload = Buffer.from(JSON.stringify({ sub: "u1", token_use: "access", exp: 4_102_444_800 })).toString("base64url");
    const claims = decodeJwtPayload(`x.${payload}.y`);

    expect(claims.sub).toBe("u1");
    expect(isJwtExpired(claims)).toBe(false);
    expect(() => assertJwtClaims(claims, "access")).not.toThrow();
  });

  it("rejects invalid JWT claims", () => {
    expect(() => assertJwtClaims({ token_use: "id" }, "access")).toThrow("Expected access token");
    expect(() => assertJwtClaims({ token_use: "access", exp: 1 }, "access")).toThrow("JWT expired");
  });

  it("wraps SDK pool failures in CognitoError", async () => {
    await expect(createUserPool("x", failingClient("AccessDeniedException"))).rejects.toMatchObject({
      code: "COGNITO_AccessDeniedException",
      message: "Cognito createUserPool failed",
    } satisfies Partial<CognitoError>);
  });

  it("wraps SDK user failures in CognitoError", async () => {
    await expect(adminCreateUser("pool", "ada@example.com", failingClient("InvalidParameterException"))).rejects.toMatchObject({
      code: "COGNITO_InvalidParameterException",
      message: "Cognito adminCreateUser failed",
    } satisfies Partial<CognitoError>);
  });
});
