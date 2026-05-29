import {
  AdminCreateUserCommand,
  AdminDeleteUserCommand,
  AdminGetUserCommand,
  CreateUserPoolClientCommand,
  CreateUserPoolCommand,
  DeleteUserPoolCommand,
  ListUsersCommand,
  type CognitoIdentityProviderClient,
  type UserType,
} from "@aws-sdk/client-cognito-identity-provider";
import { client as defaultClient } from "../client.js";
import { CognitoError } from "../errors.js";

export interface JwtPayload {
  sub?: string;
  email?: string;
  token_use?: string;
  client_id?: string;
  exp?: number;
  iat?: number;
  [claim: string]: unknown;
}

export interface UserPoolBundle {
  userPoolId: string;
  clientId: string;
}

function awsErrorName(error: unknown): string {
  if (error instanceof CognitoError && error.cause instanceof Error) return error.cause.name;
  return error instanceof Error ? error.name : "";
}

function wrapError(operation: string, error: unknown): never {
  const code = awsErrorName(error) || "UNKNOWN";
  throw new CognitoError(code, `Cognito ${operation} failed`, error);
}

function requireValue(value: string | undefined, label: string): string {
  if (!value) throw new Error(`${label} missing`);
  return value;
}

/**
 * Create user pool with email usernames and baseline password policy.
 *
 * @example
 * const userPoolId = await createUserPool("app-users");
 */
export async function createUserPool(
  name: string,
  cognito: CognitoIdentityProviderClient = defaultClient
): Promise<string> {
  try {
    const result = await cognito.send(
      new CreateUserPoolCommand({
        PoolName: name,
        AutoVerifiedAttributes: ["email"],
        UsernameAttributes: ["email"],
        Policies: { PasswordPolicy: { MinimumLength: 8, RequireLowercase: true, RequireNumbers: true } },
      })
    );
    return requireValue(result.UserPool?.Id, "UserPool Id");
  } catch (error) {
    wrapError("createUserPool", error);
  }
}

/**
 * Create public app client for browser/mobile password auth and refresh tokens.
 *
 * @example
 * const clientId = await createUserPoolClient(userPoolId, "web");
 */
export async function createUserPoolClient(
  userPoolId: string,
  name = "web",
  cognito: CognitoIdentityProviderClient = defaultClient
): Promise<string> {
  try {
    const result = await cognito.send(
      new CreateUserPoolClientCommand({
        UserPoolId: userPoolId,
        ClientName: name,
        GenerateSecret: false,
        ExplicitAuthFlows: ["ALLOW_USER_PASSWORD_AUTH", "ALLOW_REFRESH_TOKEN_AUTH"],
      })
    );
    return requireValue(result.UserPoolClient?.ClientId, "UserPoolClient ClientId");
  } catch (error) {
    wrapError("createUserPoolClient", error);
  }
}

/**
 * Create user pool and app client together.
 *
 * @example
 * const bundle = await createUserPoolBundle("app-users");
 */
export async function createUserPoolBundle(
  name: string,
  clientName = "web",
  cognito: CognitoIdentityProviderClient = defaultClient
): Promise<UserPoolBundle> {
  const userPoolId = await createUserPool(name, cognito);
  const clientId = await createUserPoolClient(userPoolId, clientName, cognito);
  return { userPoolId, clientId };
}

/**
 * Admin-create a verified user without sending invitation email.
 *
 * @example
 * await adminCreateUser(userPoolId, "ada@example.com");
 */
export async function adminCreateUser(
  userPoolId: string,
  email: string,
  cognito: CognitoIdentityProviderClient = defaultClient
) {
  try {
    return await cognito.send(
      new AdminCreateUserCommand({
        UserPoolId: userPoolId,
        Username: email,
        UserAttributes: [
          { Name: "email", Value: email },
          { Name: "email_verified", Value: "true" },
        ],
        MessageAction: "SUPPRESS",
      })
    );
  } catch (error) {
    wrapError("adminCreateUser", error);
  }
}

/**
 * Read one user by username/email.
 *
 * @example
 * const user = await adminGetUser(userPoolId, "ada@example.com");
 */
export async function adminGetUser(
  userPoolId: string,
  username: string,
  cognito: CognitoIdentityProviderClient = defaultClient
) {
  try {
    return await cognito.send(new AdminGetUserCommand({ UserPoolId: userPoolId, Username: username }));
  } catch (error) {
    wrapError("adminGetUser", error);
  }
}

/**
 * List users in a pool.
 *
 * @example
 * const users = await listUsers(userPoolId);
 */
export async function listUsers(
  userPoolId: string,
  cognito: CognitoIdentityProviderClient = defaultClient
): Promise<UserType[]> {
  try {
    return (await cognito.send(new ListUsersCommand({ UserPoolId: userPoolId }))).Users ?? [];
  } catch (error) {
    wrapError("listUsers", error);
  }
}

/**
 * Delete user; missing users are treated as cleaned up.
 *
 * @example
 * await adminDeleteUser(userPoolId, "ada@example.com");
 */
export async function adminDeleteUser(
  userPoolId: string,
  username: string,
  cognito: CognitoIdentityProviderClient = defaultClient
): Promise<void> {
  try {
    await cognito.send(new AdminDeleteUserCommand({ UserPoolId: userPoolId, Username: username }));
  } catch (error) {
    if (awsErrorName(error) === "UserNotFoundException") return;
    wrapError("adminDeleteUser", error);
  }
}

/**
 * Delete user pool; undefined or missing pools are treated as cleaned up.
 *
 * @example
 * await deleteUserPool(userPoolId);
 */
export async function deleteUserPool(
  userPoolId: string | undefined,
  cognito: CognitoIdentityProviderClient = defaultClient
): Promise<void> {
  if (!userPoolId) return;
  try {
    await cognito.send(new DeleteUserPoolCommand({ UserPoolId: userPoolId }));
  } catch (error) {
    if (awsErrorName(error) === "ResourceNotFoundException") return;
    wrapError("deleteUserPool", error);
  }
}

/**
 * Decode JWT payload without verifying signature; useful for local tests only.
 *
 * @example
 * const payload = decodeJwtPayload("header.payload.signature");
 */
export function decodeJwtPayload(token: string): JwtPayload {
  const [, payload] = token.split(".");
  if (!payload) throw new CognitoError("INVALID_JWT", "JWT payload missing");
  return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as JwtPayload;
}

/**
 * Check JWT expiry claim against current time.
 *
 * @example
 * const expired = isJwtExpired(payload);
 */
export function isJwtExpired(payload: JwtPayload, nowSeconds = Math.floor(Date.now() / 1000)): boolean {
  return typeof payload.exp === "number" && payload.exp <= nowSeconds;
}

/**
 * Require expected token_use claim and non-expired token.
 *
 * @example
 * assertJwtClaims(payload, "access");
 */
export function assertJwtClaims(payload: JwtPayload, tokenUse: string): void {
  if (payload.token_use !== tokenUse) throw new CognitoError("INVALID_TOKEN_USE", `Expected ${tokenUse} token`);
  if (isJwtExpired(payload)) throw new CognitoError("TOKEN_EXPIRED", "JWT expired");
}
