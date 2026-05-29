import {
  CreateSecretCommand,
  DeleteSecretCommand,
  GetSecretValueCommand,
  PutSecretValueCommand,
  UpdateSecretCommand,
  type SecretsManagerClient,
} from "@aws-sdk/client-secrets-manager";
import { client as defaultClient } from "../client.js";
import { SecretsManagerError } from "../errors.js";

export interface SecretVersion<TValue> {
  name: string;
  value: TValue;
  versionId?: string;
}

export interface RotatedSecret<TValue> {
  name: string;
  previous: Record<string, string>;
  versionId?: string;
  current: TValue;
}

function awsErrorName(error: unknown): string {
  if (error instanceof SecretsManagerError && error.cause instanceof Error) return error.cause.name;
  return error instanceof Error ? error.name : "";
}

function wrapError(operation: string, error: unknown): never {
  const code = awsErrorName(error) || "UNKNOWN";
  throw new SecretsManagerError(code, `Secrets Manager ${operation} failed`, error);
}

/**
 * Create JSON secret and return ARN; existing secrets return input name for idempotent labs.
 *
 * @example
 * const arn = await createJsonSecret("db/password", { password: "secret" });
 */
export async function createJsonSecret(name: string, value: unknown, sm: SecretsManagerClient = defaultClient): Promise<string> {
  try {
    return (await sm.send(new CreateSecretCommand({ Name: name, SecretString: JSON.stringify(value) }))).ARN!;
  } catch (error) {
    if (awsErrorName(error) === "ResourceExistsException") return name;
    wrapError("createJsonSecret", error);
  }
}

/**
 * Read raw secret string by name or ARN.
 *
 * @example
 * const value = await getSecretString("db/password");
 */
export async function getSecretString(name: string, sm: SecretsManagerClient = defaultClient): Promise<string | undefined> {
  try {
    return (await sm.send(new GetSecretValueCommand({ SecretId: name }))).SecretString;
  } catch (error) {
    wrapError("getSecretString", error);
  }
}

/**
 * Read and parse JSON secret value.
 *
 * @example
 * const db = await getJsonSecret<{ password: string }>("db/password");
 */
export async function getJsonSecret<TValue = unknown>(name: string, sm: SecretsManagerClient = defaultClient): Promise<TValue> {
  const secret = await getSecretString(name, sm);
  if (!secret) throw new SecretsManagerError("EMPTY_SECRET", `Secret ${name} has no string value`);
  return JSON.parse(secret) as TValue;
}

/**
 * Store new secret version with JSON value.
 *
 * @example
 * const version = await putJsonSecretValue("db/password", { password: "new" });
 */
export async function putJsonSecretValue(name: string, value: unknown, sm: SecretsManagerClient = defaultClient): Promise<string | undefined> {
  try {
    return (await sm.send(new PutSecretValueCommand({ SecretId: name, SecretString: JSON.stringify(value) }))).VersionId;
  } catch (error) {
    wrapError("putJsonSecretValue", error);
  }
}

/**
 * Update current secret JSON value.
 *
 * @example
 * await updateJsonSecret("db/password", { password: "rotated" });
 */
export async function updateJsonSecret(name: string, value: unknown, sm: SecretsManagerClient = defaultClient): Promise<void> {
  try {
    await sm.send(new UpdateSecretCommand({ SecretId: name, SecretString: JSON.stringify(value) }));
  } catch (error) {
    wrapError("updateJsonSecret", error);
  }
}

/**
 * Rotate JSON secret by reading previous value, writing new version, and returning redacted previous value.
 *
 * @example
 * const rotated = await rotateJsonSecret("db/password", { password: "new" });
 */
export async function rotateJsonSecret<TValue>(
  name: string,
  nextValue: TValue,
  sm: SecretsManagerClient = defaultClient
): Promise<RotatedSecret<TValue>> {
  const previous = await getJsonSecret<Record<string, unknown>>(name, sm);
  const versionId = await putJsonSecretValue(name, nextValue, sm);
  return { name, previous: redactSecret(previous), versionId, current: nextValue };
}

/**
 * Delete secret; undefined or missing secrets are ignored. Force delete is lab-only behavior.
 *
 * @example
 * await deleteSecret("db/password");
 */
export async function deleteSecret(name: string | undefined, sm: SecretsManagerClient = defaultClient): Promise<void> {
  if (!name) return;
  try {
    await sm.send(new DeleteSecretCommand({ SecretId: name, ForceDeleteWithoutRecovery: true }));
  } catch (error) {
    if (awsErrorName(error) === "ResourceNotFoundException") return;
    wrapError("deleteSecret", error);
  }
}

/**
 * Replace every top-level secret value with safe log placeholder.
 *
 * @example
 * const safe = redactSecret({ password: "secret" });
 */
export function redactSecret<TValue extends Record<string, unknown>>(secret: TValue): Record<string, string> {
  return Object.fromEntries(Object.keys(secret).map((key) => [key, "***REDACTED***"]));
}

/**
 * Build typed holder for a parsed secret version.
 *
 * @example
 * const version = secretVersion("db/password", { password: "secret" }, "1");
 */
export function secretVersion<TValue>(name: string, value: TValue, versionId?: string): SecretVersion<TValue> {
  return { name, value, versionId };
}
