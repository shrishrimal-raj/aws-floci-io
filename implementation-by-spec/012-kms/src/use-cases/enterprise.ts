export interface KmsAuditContext {
  tenantId: string;
  actorId: string;
  requestId: string;
  workload: string;
}

export interface KmsAuditEvent {
  version: "2024-06";
  timestamp: string;
  action: string;
  keyRef: string;
  result: "ALLOW" | "DENY" | "ERROR";
  tenantId: string;
  actorId: string;
  requestId: string;
  workload: string;
  metadata: Record<string, string | number | boolean>;
}

/**
 * Builds immutable KMS audit event metadata for CloudWatch Logs, Firehose, or S3.
 *
 * Example: record every decrypt attempt with tenant, actor, request ID, workload,
 * encryption context keys, and key alias without logging plaintext or data keys.
 */
export function kmsAuditEvent(input: {
  action: "CreateKey" | "Encrypt" | "Decrypt" | "GenerateDataKey" | "ScheduleKeyDeletion" | "RotateKey" | "CreateGrant";
  keyRef: string;
  result: "ALLOW" | "DENY" | "ERROR";
  context: KmsAuditContext;
  metadata?: Record<string, string | number | boolean>;
}, now = new Date()): KmsAuditEvent {
  return {
    version: "2024-06",
    timestamp: now.toISOString(),
    action: input.action,
    keyRef: input.keyRef,
    result: input.result,
    tenantId: input.context.tenantId,
    actorId: input.context.actorId,
    requestId: input.context.requestId,
    workload: input.context.workload,
    metadata: input.metadata ?? {},
  };
}

/**
 * Creates encryption context used to bind ciphertext to tenant/workload/purpose.
 *
 * Example: pass this to encrypt/decrypt so a copied ciphertext from tenant A cannot
 * be decrypted under tenant B context even when same key is used.
 */
export function tenantEncryptionContext(input: { tenantId: string; workload: string; purpose: string; dataClass?: string }): Record<string, string> {
  return {
    tenantId: input.tenantId,
    workload: input.workload,
    purpose: input.purpose,
    dataClass: input.dataClass ?? "confidential",
  };
}

export interface RetryPolicy {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  retryableErrors?: string[];
}

/** Calculates bounded exponential backoff for throttled KMS operations. */
export function kmsBackoffDelayMs(attempt: number, policy: RetryPolicy): number {
  const exponential = policy.baseDelayMs * 2 ** Math.max(0, attempt - 1);
  const jitter = Math.min(policy.baseDelayMs, attempt * 19);
  return Math.min(policy.maxDelayMs, exponential + jitter);
}

/**
 * Retries KMS operations on configured transient errors.
 *
 * Example: wrap encrypt/generate-data-key calls with retry for `ThrottlingException`
 * and `DependencyTimeoutException` while failing fast on access denied.
 */
export async function retryKmsOperation<T>(operation: () => Promise<T>, policy: RetryPolicy, sleep: (ms: number) => Promise<void> = async () => {}): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= policy.maxAttempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      const code = error instanceof Error ? error.name : "UnknownError";
      const retryable = !policy.retryableErrors || policy.retryableErrors.includes(code);
      if (!retryable || attempt === policy.maxAttempts) break;
      await sleep(kmsBackoffDelayMs(attempt, policy));
    }
  }
  throw lastError;
}

/**
 * Builds a least-privilege key policy for one application role and admin role.
 *
 * Example: allow app role encrypt/decrypt/generate-data-key only; keep destructive
 * key administration with platform security role.
 */
export function applicationKeyPolicy(input: { accountId: string; adminRoleArn: string; appRoleArn: string; aliasName: string }): Record<string, unknown> {
  return {
    Version: "2012-10-17",
    Statement: [
      {
        Sid: "AllowKeyAdministration",
        Effect: "Allow",
        Principal: { AWS: input.adminRoleArn },
        Action: ["kms:Create*", "kms:Describe*", "kms:Enable*", "kms:List*", "kms:Put*", "kms:Update*", "kms:Revoke*", "kms:Disable*", "kms:Get*", "kms:Delete*", "kms:ScheduleKeyDeletion", "kms:CancelKeyDeletion"],
        Resource: "*",
      },
      {
        Sid: "AllowApplicationCryptography",
        Effect: "Allow",
        Principal: { AWS: input.appRoleArn },
        Action: ["kms:Encrypt", "kms:Decrypt", "kms:ReEncrypt*", "kms:GenerateDataKey*", "kms:DescribeKey"],
        Resource: "*",
        Condition: { StringEquals: { "kms:RequestAlias": input.aliasName } },
      },
      {
        Sid: "AllowAccountRootMetadataRead",
        Effect: "Allow",
        Principal: { AWS: `arn:aws:iam::${input.accountId}:root` },
        Action: ["kms:DescribeKey", "kms:ListAliases"],
        Resource: "*",
      },
    ],
  };
}

/**
 * Builds EventBridge-style detail for KMS key lifecycle changes.
 *
 * Example: publish after rotation or deletion scheduling to notify risk, compliance,
 * and backup workflows.
 */
export function kmsLifecycleEvent(input: { keyRef: string; eventType: "RotationEnabled" | "DeletionScheduled" | "AliasChanged" | "GrantCreated"; actorId: string; reason: string }): Record<string, unknown> {
  return {
    Source: "floci.kms",
    DetailType: `Kms${input.eventType}`,
    Detail: JSON.stringify(input),
    Resources: [input.keyRef],
  };
}

/**
 * Estimates KMS request cost for cost-aware architecture reviews.
 *
 * Example: compare direct KMS encrypt per row versus envelope encryption per batch.
 */
export function estimateKmsMonthlyRequestCost(requestsPerMonth: number, pricePerTenThousand = 0.03): number {
  return Number(((requestsPerMonth / 10_000) * pricePerTenThousand).toFixed(2));
}

export interface KmsComplianceFinding {
  control: string;
  status: "PASS" | "FAIL";
  evidence: string;
}

/**
 * Checks common KMS controls before production rollout.
 *
 * Example: gate CI if alias, rotation, encryption context, owner tags, or deletion
 * recovery window are missing.
 */
export function kmsComplianceFindings(input: { aliasName: string; rotationEnabled: boolean; encryptionContextKeys: string[]; tags: Record<string, string>; deletionWindowDays: number }): KmsComplianceFinding[] {
  return [
    { control: "stable-alias", status: input.aliasName.startsWith("alias/") ? "PASS" : "FAIL", evidence: input.aliasName },
    { control: "rotation", status: input.rotationEnabled ? "PASS" : "FAIL", evidence: `rotationEnabled=${input.rotationEnabled}` },
    { control: "encryption-context", status: ["tenantId", "workload", "purpose"].every((key) => input.encryptionContextKeys.includes(key)) ? "PASS" : "FAIL", evidence: input.encryptionContextKeys.sort().join(",") },
    { control: "owner-tags", status: input.tags.Owner && input.tags.DataClass ? "PASS" : "FAIL", evidence: Object.keys(input.tags).sort().join(",") },
    { control: "safe-deletion-window", status: input.deletionWindowDays >= 7 && input.deletionWindowDays <= 30 ? "PASS" : "FAIL", evidence: `${input.deletionWindowDays} days` },
  ];
}

export interface KmsDrStep {
  order: number;
  action: string;
  owner: string;
  evidence: string;
}

/**
 * Creates disaster-recovery runbook steps for encrypted workloads.
 *
 * Example: prepare multi-region key strategy, alias cutover, ciphertext restore,
 * decrypt smoke tests, and audit evidence after regional recovery.
 */
export function kmsDisasterRecoveryRunbook(primaryRegion: string, recoveryRegion: string, aliasName: string): KmsDrStep[] {
  return [
    { order: 1, action: `verify key or replica for ${aliasName} exists in ${recoveryRegion}`, owner: "security", evidence: "DescribeKey metadata" },
    { order: 2, action: `restore encrypted data from ${primaryRegion} backup to ${recoveryRegion}`, owner: "data", evidence: "backup restore job id" },
    { order: 3, action: `point application config at ${aliasName} in ${recoveryRegion}`, owner: "platform", evidence: "config deployment id" },
    { order: 4, action: "run decrypt smoke test with required encryption context", owner: "service", evidence: "smoke test request id" },
    { order: 5, action: "publish KMS recovery audit event", owner: "compliance", evidence: "audit event object key" },
  ];
}
