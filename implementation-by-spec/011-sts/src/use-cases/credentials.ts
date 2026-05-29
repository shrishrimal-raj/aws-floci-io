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
}

export interface CredentialSummary {
  accessKeyId?: string;
  expiration?: Date;
  expiresSoon: boolean;
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
 *
 * @example
 * const identity = await getCallerIdentity();
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
 *
 * @example
 * const creds = await assumeRole("arn:aws:iam::000000000000:role/app", "worker", 900);
 */
export async function assumeRole(
  roleArn: string,
  sessionName = "floci-session",
  durationSeconds = 900,
  sts: STSClient = defaultClient
): Promise<Credentials> {
  try {
    const result = await sts.send(
      new AssumeRoleCommand({ RoleArn: roleArn, RoleSessionName: sessionName, DurationSeconds: durationSeconds })
    );
    return requireCredentials(result.Credentials, "AssumeRole");
  } catch (error) {
    wrapError("assumeRole", error);
  }
}

/**
 * Assume a role and include expiry health metadata.
 *
 * @example
 * const session = await assumeRoleSession("arn:aws:iam::000000000000:role/app");
 */
export async function assumeRoleSession(
  roleArn: string,
  sessionName = "floci-session",
  durationSeconds = 900,
  sts: STSClient = defaultClient
): Promise<AssumedRoleSession> {
  const credentials = await assumeRole(roleArn, sessionName, durationSeconds, sts);
  return { roleArn, sessionName, credentials, expiresSoon: credentialsExpireSoon(credentials) };
}

/**
 * Get federated-user credentials scoped by inline policy.
 *
 * @example
 * const creds = await getFederationToken("report-user", 900);
 */
export async function getFederationToken(
  name = "floci-user",
  durationSeconds = 900,
  sts: STSClient = defaultClient
): Promise<Credentials> {
  try {
    const result = await sts.send(
      new GetFederationTokenCommand({
        Name: name,
        DurationSeconds: durationSeconds,
        Policy: JSON.stringify({ Version: "2012-10-17", Statement: [{ Effect: "Allow", Action: "*", Resource: "*" }] }),
      })
    );
    return requireCredentials(result.Credentials, "GetFederationToken");
  } catch (error) {
    wrapError("getFederationToken", error);
  }
}

/**
 * Detect credentials that are missing expiry or expiring within threshold.
 *
 * @example
 * const soon = credentialsExpireSoon(credentials, 60_000);
 */
export function credentialsExpireSoon(creds: Pick<Credentials, "Expiration">, withinMs = 60_000): boolean {
  return !creds.Expiration || creds.Expiration.getTime() - Date.now() < withinMs;
}

/**
 * Build safe credential metadata without secret access key/session token.
 *
 * @example
 * const summary = summarizeCredentials(credentials);
 */
export function summarizeCredentials(creds: Credentials, withinMs = 60_000): CredentialSummary {
  return {
    accessKeyId: creds.AccessKeyId,
    expiration: creds.Expiration,
    expiresSoon: credentialsExpireSoon(creds, withinMs),
  };
}

/**
 * Assert credentials still have enough TTL for a job.
 *
 * @example
 * assertCredentialsFresh(credentials, 300_000);
 */
export function assertCredentialsFresh(creds: Credentials, requiredTtlMs = 60_000): void {
  if (credentialsExpireSoon(creds, requiredTtlMs)) throw new STSError("CREDENTIALS_EXPIRE_SOON", "STS credentials expire soon");
}
