import {
  AdminCreateUserCommand,
  AdminDeleteUserCommand,
  AdminGetUserCommand,
  type AdminGetUserCommandOutput,
  type AdminCreateUserCommandOutput,
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
  aud?: string;
  iss?: string;
  exp?: number;
  iat?: number;
  [claim: string]: unknown;
}

export interface UserPoolBundle {
  userPoolId: string;
  clientId: string;
}

export interface ControlPlaneRetryOptions {
  attempts?: number;
  delayMs?: number;
  shouldRetry?: (error: unknown, attempt: number) => boolean;
}

export interface ManagedUserInput {
  email: string;
  attributes?: Record<string, string>;
}

export interface ManagedUserResult {
  email: string;
  status: "created";
}

export interface AuthAuditEvent {
  eventType: "auth.claims.accepted" | "auth.claims.rejected";
  requestId: string;
  subject?: string;
  email?: string;
  tokenUse?: string;
  clientId?: string;
  issuer?: string;
  reason?: string;
  at: string;
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

function sleep(delayMs: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, delayMs));
}

/**
 * Retry Cognito control-plane work such as pool, client, or admin-user creation.
 * Useful for automation that may hit emulator startup races or cloud throttling.
 *
 * @example
 * const userPoolId = await retryCognitoControlPlane(() => createUserPool("app-users"), { attempts: 3, delayMs: 250 });
 */
export async function retryCognitoControlPlane<T>(
  operation: () => Promise<T>,
  options: ControlPlaneRetryOptions = {}
): Promise<T> {
  const attempts = options.attempts ?? 3;
  const delayMs = options.delayMs ?? 250;
  const shouldRetry = options.shouldRetry ?? (() => true);
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt >= attempts || !shouldRetry(error, attempt)) throw error;
      await sleep(delayMs * attempt);
    }
  }

  throw lastError;
}

/**
 * Create user pool with email usernames and baseline password policy.
 * Enterprise use: isolate users by product, tenant tier, or regulated boundary when needed.
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
 * Use `GenerateSecret: false` only for public clients that cannot safely store a secret.
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
 * Good for local labs, CI smoke tests, and short-lived preview environments.
 *
 * @example
 * const bundle = await createUserPoolBundle("app-users", "web");
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
 * Useful for test fixtures, employee pre-provisioning, and migration dry-runs.
 *
 * @example
 * await adminCreateUser(userPoolId, "ada@example.com", { department: "engineering" });
 */
export async function adminCreateUser(
  userPoolId: string,
  email: string,
  attributes: Record<string, string> = {},
  cognito: CognitoIdentityProviderClient = defaultClient
): Promise<AdminCreateUserCommandOutput> {
  try {
    return await cognito.send(
      new AdminCreateUserCommand({
        UserPoolId: userPoolId,
        Username: email,
        UserAttributes: [
          { Name: "email", Value: email },
          { Name: "email_verified", Value: "true" },
          ...Object.entries(attributes).map(([Name, Value]) => ({ Name, Value })),
        ],
        MessageAction: "SUPPRESS",
      })
    );
  } catch (error) {
    wrapError("adminCreateUser", error);
  }
}

/**
 * Create several managed users in order and return an auditable result list.
 * Use for enterprise seed data, migrations, or training environments.
 *
 * @example
 * const users = await createManagedUsers(userPoolId, [{ email: "ada@example.com", attributes: { "custom:role": "admin" } }]);
 */
export async function createManagedUsers(
  userPoolId: string,
  users: ManagedUserInput[],
  cognito: CognitoIdentityProviderClient = defaultClient
): Promise<ManagedUserResult[]> {
  const created: ManagedUserResult[] = [];

  for (const user of users) {
    await adminCreateUser(userPoolId, user.email, user.attributes ?? {}, cognito);
    created.push({ email: user.email, status: "created" });
  }

  return created;
}

/**
 * Read one user by username/email.
 * Use for admin support screens, audit investigations, and fixture verification.
 *
 * @example
 * const user = await adminGetUser(userPoolId, "ada@example.com");
 */
export async function adminGetUser(
  userPoolId: string,
  username: string,
  cognito: CognitoIdentityProviderClient = defaultClient
): Promise<AdminGetUserCommandOutput> {
  try {
    return await cognito.send(new AdminGetUserCommand({ UserPoolId: userPoolId, Username: username }));
  } catch (error) {
    wrapError("adminGetUser", error);
  }
}

/**
 * List users in a pool.
 * Useful for admin reports and local verification; production jobs should paginate large pools.
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
 * Call from teardown scripts and right-to-erasure workflows after downstream data handling is complete.
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
 * Use in `finally` blocks so examples and CI jobs do not leak identity resources.
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
 * Create a pool bundle, pass it to a workflow, then always delete it.
 * Best for tests, examples, sandboxes, and lifecycle-safe automation.
 *
 * @example
 * await withUserPoolLifecycle("training", async ({ userPoolId }) => adminCreateUser(userPoolId, "ada@example.com"));
 */
export async function withUserPoolLifecycle<T>(
  name: string,
  workflow: (bundle: UserPoolBundle) => Promise<T>,
  clientName = "web",
  cognito: CognitoIdentityProviderClient = defaultClient
): Promise<T> {
  let userPoolId: string | undefined;
  try {
    const bundle = await createUserPoolBundle(name, clientName, cognito);
    userPoolId = bundle.userPoolId;
    return await workflow(bundle);
  } finally {
    await deleteUserPool(userPoolId, cognito);
  }
}

/**
 * Build real AWS Cognito issuer URL for a user pool.
 * Use with JWT verification libraries that validate `iss` and fetch JWKS.
 *
 * @example
 * const issuer = buildCognitoIssuerUrl("us-east-1_abc", "us-east-1");
 */
export function buildCognitoIssuerUrl(userPoolId: string, region = process.env.AWS_REGION ?? "us-east-1"): string {
  return `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`;
}

/**
 * Decode JWT payload without verifying signature; useful for local tests only.
 * Production APIs must verify signature against Cognito JWKS before trusting claims.
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
 * Missing `exp` returns false so callers can decide whether to require it.
 *
 * @example
 * const expired = isJwtExpired(payload);
 */
export function isJwtExpired(payload: JwtPayload, nowSeconds = Math.floor(Date.now() / 1000)): boolean {
  return typeof payload.exp === "number" && payload.exp <= nowSeconds;
}

/**
 * Require expected token_use claim and non-expired token.
 * Use `access` for API authorization and `id` for profile display flows.
 *
 * @example
 * assertJwtClaims(payload, "access");
 */
export function assertJwtClaims(payload: JwtPayload, tokenUse: string): void {
  if (payload.token_use !== tokenUse) throw new CognitoError("INVALID_TOKEN_USE", `Expected ${tokenUse} token`);
  if (isJwtExpired(payload)) throw new CognitoError("TOKEN_EXPIRED", "JWT expired");
}

/**
 * Require token audience/client claim to match the app client that issued the token.
 * Access tokens usually use `client_id`; ID tokens usually use `aud`.
 *
 * @example
 * assertJwtAudience(payload, clientId);
 */
export function assertJwtAudience(payload: JwtPayload, expectedClientId: string): void {
  const actual = payload.client_id ?? payload.aud;
  if (actual !== expectedClientId) throw new CognitoError("INVALID_AUDIENCE", "JWT audience/client mismatch");
}

/**
 * Return safe claims for logs without leaking full JWT contents or custom sensitive attributes.
 * Use in API authorizers, middleware, and support tooling.
 *
 * @example
 * console.log(redactJwtClaims(payload));
 */
export function redactJwtClaims(payload: JwtPayload): Pick<JwtPayload, "sub" | "email" | "token_use" | "client_id" | "aud" | "iss" | "exp"> {
  return {
    sub: payload.sub,
    email: payload.email,
    token_use: payload.token_use,
    client_id: payload.client_id,
    aud: payload.aud,
    iss: payload.iss,
    exp: payload.exp,
  };
}

/**
 * Build structured audit event for accepted or rejected auth decisions.
 * Send this shape to CloudWatch Logs, Firehose, Security Lake, or a SIEM in production.
 *
 * @example
 * const event = authAuditEvent("auth.claims.accepted", claims, "req-1");
 */
export function authAuditEvent(
  eventType: AuthAuditEvent["eventType"],
  payload: JwtPayload,
  requestId: string,
  reason?: string,
  now = new Date()
): AuthAuditEvent {
  return {
    eventType,
    requestId,
    subject: payload.sub,
    email: payload.email,
    tokenUse: payload.token_use,
    clientId: payload.client_id ?? payload.aud,
    issuer: payload.iss,
    reason,
    at: now.toISOString(),
  };
}
