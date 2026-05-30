import {
  AssumeRoleCommand,
  GetCallerIdentityCommand,
  GetFederationTokenCommand,
  type Credentials,
  type GetCallerIdentityCommandOutput,
  type STSClient,
} from "@aws-sdk/client-sts";
import { client as defaultClient } from "../client.js";
import { STSError } from "../errors.js";

export interface AssumedRoleSession {
  roleArn: string;
  sessionName: string;
  credentials: Credentials;
  expiresSoon: boolean;
  summary: CredentialSummary;
}

export interface CredentialSummary {
  accessKeyId?: string;
  expiration?: Date;
  expiresSoon: boolean;
  ttlSeconds?: number;
}

export interface AssumeRoleOptions {
  externalId?: string;
  sourceIdentity?: string;
  sessionPolicy?: string;
}

export interface SessionPolicyStatement {
  effect: "Allow" | "Deny";
  actions: string[];
  resources: string[];
  conditions?: Record<string, Record<string, string | string[]>>;
}

export interface StsAuditEvent {
  timestamp: string;
  service: "sts";
  operation: string;
  actor: string;
  targetArn?: string;
  sessionName?: string;
  outcome: "ALLOW" | "DENY" | "ERROR";
  reason?: string;
  traceId?: string;
  ticketId?: string;
}

export interface CredentialRefreshPlan {
  expiresAt?: Date;
  refreshAt?: Date;
  refreshInSeconds?: number;
  safeForWorkload: boolean;
  reason: string;
}

export interface StsRetryPlan {
  maxAttempts: number;
  backoffSeconds: number[];
  retryableErrors: string[];
}

function awsErrorName(error: unknown): string {
  if (error instanceof STSError && error.cause instanceof Error) return error.cause.name;
  return error instanceof Error ? error.name : "";
}

function wrapError(operation: string, error: unknown): never {
  const code = awsErrorName(error) || "UNKNOWN";
  throw new STSError(code, `STS ${operation} failed`, error);
}

function requireCredentials(credentials: Credentials | undefined, operation: string): Credentials {
  if (!credentials) throw new Error(`${operation} returned no credentials`);
  return credentials;
}

/**
 * Return account, ARN, and user ID for current caller.
 * Use at application startup, CI jobs, and break-glass workflows to prove which identity is active before touching AWS.
 * Example: deployment bot logs caller ARN and account before assuming prod deploy role.
 */
export async function getCallerIdentity(sts: STSClient = defaultClient): Promise<GetCallerIdentityCommandOutput> {
  try {
    return await sts.send(new GetCallerIdentityCommand({}));
  } catch (error) {
    wrapError("getCallerIdentity", error);
  }
}

/**
 * Assume a role and return short-lived credentials.
 * Use for cross-account access, deploy automation, tenant isolation, and emergency access without long-lived keys.
 * Example: CI assumes `orders-prod-deploy` for 15 minutes with external ID and scoped session policy.
 */
export async function assumeRole(
  roleArn: string,
  sessionName = "floci-session",
  durationSeconds = 900,
  sts: STSClient = defaultClient,
  options: AssumeRoleOptions = {},
): Promise<Credentials> {
  validateRoleSessionName(sessionName);
  try {
    const result = await sts.send(
      new AssumeRoleCommand({
        RoleArn: roleArn,
        RoleSessionName: sessionName,
        DurationSeconds: durationSeconds,
        ExternalId: options.externalId,
        SourceIdentity: options.sourceIdentity,
        Policy: options.sessionPolicy,
      }),
    );
    return requireCredentials(result.Credentials, "AssumeRole");
  } catch (error) {
    wrapError("assumeRole", error);
  }
}

/**
 * Assume a role and include expiry health metadata plus safe summary.
 * Use when an app needs credentials and operations teams need visibility without logging secrets.
 * Example: batch job prints access key ID suffix, expiration, and `expiresSoon` before starting work.
 */
export async function assumeRoleSession(
  roleArn: string,
  sessionName = "floci-session",
  durationSeconds = 900,
  sts: STSClient = defaultClient,
  options: AssumeRoleOptions = {},
): Promise<AssumedRoleSession> {
  const credentials = await assumeRole(roleArn, sessionName, durationSeconds, sts, options);
  return { roleArn, sessionName, credentials, expiresSoon: credentialsExpireSoon(credentials), summary: summarizeCredentials(credentials) };
}

/**
 * Get federated-user credentials scoped by inline policy.
 * Use for legacy federation, vendor portals, and short-lived report access where IAM Identity Center is unavailable.
 * Example: issue 1-hour read-only reporting credentials for a finance analyst.
 */
export async function getFederationToken(
  name = "floci-user",
  durationSeconds = 900,
  sts: STSClient = defaultClient,
  sessionPolicy = buildScopedSessionPolicy([{ effect: "Allow", actions: ["*"], resources: ["*"] }]),
): Promise<Credentials> {
  try {
    const result = await sts.send(
      new GetFederationTokenCommand({
        Name: name,
        DurationSeconds: durationSeconds,
        Policy: sessionPolicy,
      }),
    );
    return requireCredentials(result.Credentials, "GetFederationToken");
  } catch (error) {
    wrapError("getFederationToken", error);
  }
}

/**
 * Detect credentials that are missing expiry or expiring within threshold.
 * Use before long-running jobs, retries, and downstream AWS calls to avoid partial failure mid-transaction.
 * Example: refresh when less than 5 minutes remain before exporting compliance reports.
 */
export function credentialsExpireSoon(creds: Pick<Credentials, "Expiration">, withinMs = 60_000): boolean {
  return !creds.Expiration || creds.Expiration.getTime() - Date.now() < withinMs;
}

/**
 * Build safe credential metadata without `SecretAccessKey` or `SessionToken`.
 * Use in logs, dashboards, and audit events where operators need expiry visibility but secrets must never leak.
 * Example: log `{ accessKeyId, expiration, expiresSoon }` after AssumeRole succeeds.
 */
export function summarizeCredentials(creds: Credentials, withinMs = 60_000): CredentialSummary {
  const ttlSeconds = creds.Expiration ? Math.max(0, Math.floor((creds.Expiration.getTime() - Date.now()) / 1000)) : undefined;
  return {
    accessKeyId: creds.AccessKeyId,
    expiration: creds.Expiration,
    expiresSoon: credentialsExpireSoon(creds, withinMs),
    ttlSeconds,
  };
}

/**
 * Assert credentials still have enough TTL for a job.
 * Use as a fail-fast guard before migration jobs, blue/green deploys, or disaster recovery restore actions.
 * Example: require 30 minutes of TTL before a database backup copy starts.
 */
export function assertCredentialsFresh(creds: Credentials, requiredTtlMs = 60_000): void {
  if (credentialsExpireSoon(creds, requiredTtlMs)) throw new STSError("CREDENTIALS_EXPIRE_SOON", "STS credentials expire soon");
}

/**
 * Validate STS role session names before sending requests.
 * Use to reject user-provided names that would break AssumeRole or produce poor CloudTrail attribution.
 * Example: convert ticket and actor into `chg-1042-release-bot` then validate it.
 */
export function validateRoleSessionName(sessionName: string): string {
  if (!/^[\w+=,.@-]{2,64}$/.test(sessionName)) {
    throw new STSError("INVALID_SESSION_NAME", "Role session name must be 2-64 chars and contain only AWS-supported characters");
  }
  return sessionName;
}

/**
 * Build least-privilege inline session policy JSON.
 * Use to reduce permissions below the assumed role policy for one job, tenant, or data boundary.
 * Example: allow `s3:GetObject` only for one tenant prefix during export.
 */
export function buildScopedSessionPolicy(statements: SessionPolicyStatement[]): string {
  if (!statements.length) throw new STSError("EMPTY_SESSION_POLICY", "At least one session policy statement is required");
  return JSON.stringify({
    Version: "2012-10-17",
    Statement: statements.map((statement) => ({
      Effect: statement.effect,
      Action: statement.actions,
      Resource: statement.resources,
      ...(statement.conditions ? { Condition: statement.conditions } : {}),
    })),
  });
}

/**
 * Build confused-deputy-safe external ID.
 * Use when third-party SaaS or a central platform account assumes customer-owned roles.
 * Example: `acme-payments-vendor-2026` becomes external ID shared in role trust policy.
 */
export function createExternalId(tenantId: string, purpose: string): string {
  const value = `${tenantId}-${purpose}`.toLowerCase().replace(/[^a-z0-9+=,.@:-]/g, "-").replace(/-+/g, "-");
  if (value.length < 8) throw new STSError("INVALID_EXTERNAL_ID", "External ID must be descriptive enough for tenant isolation");
  return value.slice(0, 1224);
}

/**
 * Create structured STS audit event for CloudWatch Logs, EventBridge, or SIEM.
 * Use for AssumeRole, GetCallerIdentity, federation token issuance, access denial, and emergency access reviews.
 * Example: emit `ALLOW` with ticket ID after prod deploy role assumption.
 */
export function createStsAuditEvent(input: Omit<StsAuditEvent, "timestamp" | "service"> & { timestamp?: string }): StsAuditEvent {
  return {
    timestamp: input.timestamp ?? new Date().toISOString(),
    service: "sts",
    operation: input.operation,
    actor: input.actor,
    targetArn: input.targetArn,
    sessionName: input.sessionName,
    outcome: input.outcome,
    reason: input.reason,
    traceId: input.traceId,
    ticketId: input.ticketId,
  };
}

/**
 * Plan when temporary credentials should refresh before expiry.
 * Use for workers, event processors, and long-running data lifecycle jobs that must avoid mid-flight expiration.
 * Example: refresh 5 minutes before expiration and require 15 minutes minimum TTL for each batch.
 */
export function planCredentialRefresh(creds: Pick<Credentials, "Expiration">, options: { refreshBeforeMs?: number; requiredWorkloadTtlMs?: number } = {}): CredentialRefreshPlan {
  const refreshBeforeMs = options.refreshBeforeMs ?? 300_000;
  const requiredWorkloadTtlMs = options.requiredWorkloadTtlMs ?? 900_000;
  if (!creds.Expiration) return { safeForWorkload: false, reason: "credentials have no expiration" };

  const now = Date.now();
  const refreshAt = new Date(creds.Expiration.getTime() - refreshBeforeMs);
  const refreshInSeconds = Math.max(0, Math.floor((refreshAt.getTime() - now) / 1000));
  const safeForWorkload = creds.Expiration.getTime() - now >= requiredWorkloadTtlMs;
  return {
    expiresAt: creds.Expiration,
    refreshAt,
    refreshInSeconds,
    safeForWorkload,
    reason: safeForWorkload ? "credentials have enough TTL" : "credentials expire before workload safety window",
  };
}

/**
 * Standard retry/backoff plan for STS throttling and transient failures.
 * Use around role assumption in CI/CD, event processors, and disaster recovery automation.
 * Example: retry throttling with exponential backoff, but do not retry AccessDenied.
 */
export function createStsRetryPlan(profile: "fast" | "standard" | "conservative" = "standard"): StsRetryPlan {
  if (profile === "fast") return { maxAttempts: 3, backoffSeconds: [1, 2, 4], retryableErrors: ["ThrottlingException", "RequestLimitExceeded"] };
  if (profile === "conservative") {
    return { maxAttempts: 6, backoffSeconds: [2, 5, 10, 20, 40, 80], retryableErrors: ["ThrottlingException", "RequestLimitExceeded", "ServiceUnavailable"] };
  }
  return { maxAttempts: 4, backoffSeconds: [1, 3, 7, 15], retryableErrors: ["ThrottlingException", "RequestLimitExceeded", "ServiceUnavailable"] };
}
