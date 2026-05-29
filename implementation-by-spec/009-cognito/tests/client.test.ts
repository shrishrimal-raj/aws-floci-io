import { describe, it, expect, vi } from "vitest";
import type { CognitoIdentityProviderClient } from "@aws-sdk/client-cognito-identity-provider";
import { client } from "../src/client.js";
import type { CognitoError } from "../src/errors.js";
import {
  adminCreateUser,
  assertJwtAudience,
  assertJwtClaims,
  authAuditEvent,
  buildCognitoIssuerUrl,
  createManagedUsers,
  createUserPool,
  decodeJwtPayload,
  deleteUserPool,
  isJwtExpired,
  redactJwtClaims,
  retryCognitoControlPlane,
  withUserPoolLifecycle,
} from "../src/use-cases/user-pools.js";

function failingClient(name: string): CognitoIdentityProviderClient {
  return {
    send: vi.fn(async () => {
      const error = new Error(`${name} failed`);
      error.name = name;
      throw error;
    }),
  } as unknown as CognitoIdentityProviderClient;
}

function commandName(command: unknown): string {
  return command?.constructor?.name ?? "";
}

function mockClient(): CognitoIdentityProviderClient & { send: ReturnType<typeof vi.fn> } {
  const send = vi.fn(async (command: unknown) => {
    switch (commandName(command)) {
      case "CreateUserPoolCommand":
        return { UserPool: { Id: "pool-1" } };
      case "CreateUserPoolClientCommand":
        return { UserPoolClient: { ClientId: "client-1" } };
      case "ListUsersCommand":
        return { Users: [{ Username: "ada@example.com" }] };
      case "AdminGetUserCommand":
        return { Username: "ada@example.com", UserStatus: "CONFIRMED" };
      case "AdminCreateUserCommand":
      case "AdminDeleteUserCommand":
      case "DeleteUserPoolCommand":
        return {};
      default:
        return {};
    }
  });
  return { send } as unknown as CognitoIdentityProviderClient & { send: ReturnType<typeof vi.fn> };
}

describe("Cognito", () => {
  it("client is configured against Floci", () => {
    expect(client).toBeDefined();
  });

  it("decodes and validates JWT payloads", () => {
    const payload = Buffer.from(
      JSON.stringify({ sub: "u1", token_use: "access", client_id: "client-1", exp: 4_102_444_800 })
    ).toString("base64url");
    const claims = decodeJwtPayload(`x.${payload}.y`);

    expect(claims.sub).toBe("u1");
    expect(isJwtExpired(claims)).toBe(false);
    expect(() => assertJwtClaims(claims, "access")).not.toThrow();
    expect(() => assertJwtAudience(claims, "client-1")).not.toThrow();
  });

  it("rejects invalid JWT claims", () => {
    expect(() => assertJwtClaims({ token_use: "id" }, "access")).toThrow("Expected access token");
    expect(() => assertJwtClaims({ token_use: "access", exp: 1 }, "access")).toThrow("JWT expired");
    expect(() => assertJwtAudience({ client_id: "wrong" }, "client-1")).toThrow("JWT audience/client mismatch");
  });

  it("builds issuer URLs and safe auth audit events", () => {
    const claims = {
      sub: "user-1",
      email: "ada@example.com",
      token_use: "access",
      client_id: "client-1",
      iss: buildCognitoIssuerUrl("us-east-1_pool", "us-east-1"),
      exp: 4_102_444_800,
      secret: "never-log",
    };

    expect(claims.iss).toBe("https://cognito-idp.us-east-1.amazonaws.com/us-east-1_pool");
    expect(redactJwtClaims(claims)).not.toHaveProperty("secret");
    expect(authAuditEvent("auth.claims.accepted", claims, "req-1", undefined, new Date("2026-01-01T00:00:00Z"))).toMatchObject({
      eventType: "auth.claims.accepted",
      requestId: "req-1",
      subject: "user-1",
      clientId: "client-1",
      at: "2026-01-01T00:00:00.000Z",
    });
  });

  it("creates managed users for enterprise seed data", async () => {
    const cognito = mockClient();

    await expect(
      createManagedUsers(
        "pool-1",
        [
          { email: "admin@example.com", attributes: { "custom:role": "admin" } },
          { email: "auditor@example.com", attributes: { "custom:role": "auditor" } },
        ],
        cognito
      )
    ).resolves.toEqual([
      { email: "admin@example.com", status: "created" },
      { email: "auditor@example.com", status: "created" },
    ]);
    expect(cognito.send).toHaveBeenCalledTimes(2);
  });

  it("runs lifecycle workflows and cleans up pools", async () => {
    const cognito = mockClient();

    await expect(withUserPoolLifecycle("training", async ({ userPoolId }) => userPoolId, "web", cognito)).resolves.toBe("pool-1");
    expect(cognito.send.mock.calls.map(([command]) => commandName(command))).toEqual([
      "CreateUserPoolCommand",
      "CreateUserPoolClientCommand",
      "DeleteUserPoolCommand",
    ]);
  });

  it("retries transient Cognito control-plane work", async () => {
    const operation = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error("throttle"))
      .mockResolvedValueOnce("ok");

    await expect(retryCognitoControlPlane(operation, { attempts: 2, delayMs: 0 })).resolves.toBe("ok");
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it("stops retrying when policy rejects the error", async () => {
    const operation = vi.fn<() => Promise<string>>().mockRejectedValue(new Error("validation"));

    await expect(
      retryCognitoControlPlane(operation, { attempts: 3, delayMs: 0, shouldRetry: () => false })
    ).rejects.toThrow("validation");
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it("wraps SDK pool failures in CognitoError", async () => {
    await expect(createUserPool("x", failingClient("AccessDeniedException"))).rejects.toMatchObject({
      code: "COGNITO_AccessDeniedException",
      message: "Cognito createUserPool failed",
    } satisfies Partial<CognitoError>);
  });

  it("wraps SDK user failures in CognitoError", async () => {
    await expect(adminCreateUser("pool", "ada@example.com", {}, failingClient("InvalidParameterException"))).rejects.toMatchObject({
      code: "COGNITO_InvalidParameterException",
      message: "Cognito adminCreateUser failed",
    } satisfies Partial<CognitoError>);
  });

  it("ignores undefined pool deletes", async () => {
    await expect(deleteUserPool(undefined)).resolves.toBeUndefined();
  });
});
