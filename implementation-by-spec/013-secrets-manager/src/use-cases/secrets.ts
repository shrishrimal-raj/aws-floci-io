import {
  CreateSecretCommand,
  DeleteSecretCommand,
  DescribeSecretCommand,
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

export interface SecretAuditEvent {
  secretId: string;
  actor: string;
  action: "create" | "read" | "update" | "rotate" | "delete" | "deny";
  outcome: "success" | "failed" | "denied";
  at: string;
  reason?: string;
  details?: Record<string, unknown>;
}

export interface SecretMetadata {
  name?: string;
  arn?: string;
  description?: string;
  lastChangedDate?: Date;
  lastAccessedDate?: Date;
  deletedDate?: Date;
  rotationEnabled?: boolean;
}

export interface SecretLifecyclePolicy {
  rotateAfterDays: number;
  deleteIfUnusedAfterDays: number;
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
 * Example: platform bootstrap stores `prod/payments/db` credentials once and can rerun setup safely.
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
 * Example: Lambda init phase reads `prod/payments/api-key` once, then parses or caches it in memory.
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
 * Example: RDS client factory loads `{ username, password, host }` without exposing raw string to callers.
 */
export async function getJsonSecret<TValue = unknown>(name: string, sm: SecretsManagerClient = defaultClient): Promise<TValue> {
  const secret = await getSecretString(name, sm);
  if (!secret) throw new SecretsManagerError("EMPTY_SECRET", `Secret ${name} has no string value`);
  return JSON.parse(secret) as TValue;
}

/**
 * Store new secret version with JSON value.
 *
 * Example: rotation workflow writes next credential version while application still supports previous password.
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
 * Example: admin console replaces webhook signing secret after tenant requests emergency credential reset.
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
 * Example: scheduled rotation job creates new API key and stores redacted previous value in audit log.
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
 * Example: integration tests force-delete temporary `floci/example/*` secrets during cleanup.
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
 * Schedule production-safe secret deletion with recovery window.
 *
 * Example: offboarding tenant schedules deletion in 30 days so accidental removal can be restored.
 */
export async function deleteSecretWithRecovery(name: string, recoveryWindowInDays = 30, sm: SecretsManagerClient = defaultClient): Promise<void> {
  try {
    await sm.send(new DeleteSecretCommand({ SecretId: name, RecoveryWindowInDays: recoveryWindowInDays }));
  } catch (error) {
    if (awsErrorName(error) === "ResourceNotFoundException") return;
    wrapError("deleteSecretWithRecovery", error);
  }
}

/**
 * Read metadata for lifecycle, compliance, and rotation dashboards.
 *
 * Example: command center flags secrets whose `LastChangedDate` is older than rotation policy.
 */
export async function getSecretMetadata(name: string, sm: SecretsManagerClient = defaultClient): Promise<SecretMetadata> {
  try {
    const result = await sm.send(new DescribeSecretCommand({ SecretId: name }));
    return {
      name: result.Name,
      arn: result.ARN,
      description: result.Description,
      lastChangedDate: result.LastChangedDate,
      lastAccessedDate: result.LastAccessedDate,
      deletedDate: result.DeletedDate,
      rotationEnabled: result.RotationEnabled,
    };
  } catch (error) {
    wrapError("getSecretMetadata", error);
  }
}

/**
 * Replace every top-level secret value with safe log placeholder.
 *
 * Example: audit log records `{ username: "***REDACTED***", password: "***REDACTED***" }` instead of raw values.
 */
export function redactSecret<TValue extends Record<string, unknown>>(secret: TValue): Record<string, string> {
  return Object.fromEntries(Object.keys(secret).map((key) => [key, "***REDACTED***"]));
}

/**
 * Recursively redacts nested secret structures for diagnostics.
 *
 * Example: OAuth config with nested client secret and token endpoints can be logged without leaking values.
 */
export function redactSecretDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactSecretDeep);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value as Record<string, unknown>).map((key) => [key, "***REDACTED***"]));
  }
  return "***REDACTED***";
}

/**
 * Build typed holder for a parsed secret version.
 *
 * Example: repository returns `secretVersion("db/app", dbCredentials, versionId)` to preserve version metadata.
 */
export function secretVersion<TValue>(name: string, value: TValue, versionId?: string): SecretVersion<TValue> {
  return { name, value, versionId };
}

/**
 * Builds structured audit event without including raw secret value.
 *
 * Example: every read/rotate/delete operation emits event to CloudWatch Logs or SIEM pipeline.
 */
export function secretAuditEvent(input: Omit<SecretAuditEvent, "at">, now = new Date()): SecretAuditEvent {
  return { ...input, at: now.toISOString() };
}

/**
 * Enforces allowed secret namespace before reading or writing.
 *
 * Example: tenant service can access `prod/tenant-a/*` but is denied for `prod/tenant-b/*`.
 */
export function assertSecretNameAllowed(secretId: string, allowedPrefix: string): void {
  if (!secretId.startsWith(allowedPrefix)) throw new SecretsManagerError("ACCESS_DENIED", `Secret ${secretId} outside allowed prefix ${allowedPrefix}`);
}

/**
 * Retries transient secret operations with capped exponential backoff.
 *
 * Example: Lambda cold start retries throttled `GetSecretValue` calls but still fails fast for access denied errors.
 */
export async function withSecretRetry<T>(operation: () => Promise<T>, maxAttempts = 3, baseDelayMs = 50): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      const name = awsErrorName(error);
      if (attempt === maxAttempts || !["ThrottlingException", "TooManyRequestsException", "TimeoutError"].includes(name)) break;
      await new Promise((resolve) => setTimeout(resolve, baseDelayMs * 2 ** (attempt - 1)));
    }
  }
  throw lastError;
}

/**
 * Decides lifecycle actions from rotation and access age.
 *
 * Example: compliance job rotates secrets older than 90 days and schedules deletion for secrets unused for 365 days.
 */
export function secretLifecycleDecision(
  metadata: Pick<SecretMetadata, "lastChangedDate" | "lastAccessedDate" | "deletedDate">,
  policy: SecretLifecyclePolicy,
  now = new Date()
): { rotate: boolean; scheduleDeletion: boolean; alreadyDeleted: boolean } {
  return {
    rotate: !!metadata.lastChangedDate && daysBetween(metadata.lastChangedDate, now) >= policy.rotateAfterDays,
    scheduleDeletion: !!metadata.lastAccessedDate && daysBetween(metadata.lastAccessedDate, now) >= policy.deleteIfUnusedAfterDays,
    alreadyDeleted: !!metadata.deletedDate,
  };
}

/**
 * Estimates monthly Secrets Manager storage + API request cost.
 *
 * Example: FinOps dashboard forecasts cost impact of moving 1,000 tenant API keys into per-tenant secrets.
 */
export function estimateSecretsManagerMonthlyCost(
  secretCount: number,
  apiCalls: number,
  secretMonthlyUsd = 0.4,
  apiPer10kUsd = 0.05
): number {
  return Number((secretCount * secretMonthlyUsd + (apiCalls / 10_000) * apiPer10kUsd).toFixed(2));
}

function daysBetween(date: Date, now: Date): number {
  return Math.floor((now.getTime() - date.getTime()) / 86_400_000);
}
