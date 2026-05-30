import { getJsonParameter, getStringParameter, loadConfigByPath, parameterPath, putJsonParameter, putStringParameter } from "./parameters.js";
import type { SSMClient } from "@aws-sdk/client-ssm";

export interface RetryPolicy {
  maxAttempts: number;
  baseDelayMs: number;
  backoffRate: number;
  retryableErrors?: string[];
}

export interface AuditLogEntry {
  eventId: string;
  actor: string;
  action: string;
  parameterName: string;
  outcome: "ALLOW" | "DENY" | "ERROR";
  at: string;
  metadata?: Record<string, unknown>;
}

export interface ParameterLifecyclePolicy {
  path: string;
  owner: string;
  classification: "public" | "internal" | "confidential" | "restricted";
  rotationDays?: number;
  maxAgeDays: number;
  backupRequired: boolean;
}

export interface ServiceRuntimeConfig {
  serviceName: string;
  environment: string;
  databaseUrl: string;
  featureFlags: Record<string, boolean>;
  apiTimeoutMs: number;
}

export interface DisasterRecoveryPlan {
  sourcePath: string;
  backupPath: string;
  exportBucket: string;
  restoreRunbook: string[];
  rpoHours: number;
  rtoHours: number;
}

export interface CostOptimizationPlan {
  path: string;
  estimatedReadsPerHour: number;
  cacheTtlSeconds: number;
  batchReads: boolean;
  notes: string[];
}

/**
 * Retries idempotent Parameter Store reads/writes with exponential backoff.
 * Example: wrap config bootstrap reads during Lambda cold start to survive SSM throttling.
 */
export async function withParameterStoreRetry<T>(operation: () => Promise<T>, policy: RetryPolicy): Promise<T> {
  let attempt = 0;
  let lastError: unknown;

  while (attempt < policy.maxAttempts) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      attempt += 1;
      const name = error instanceof Error ? error.name : "UnknownError";
      const canRetry = !policy.retryableErrors || policy.retryableErrors.includes(name);
      if (attempt >= policy.maxAttempts || !canRetry) break;
      const delayMs = Math.round(policy.baseDelayMs * policy.backoffRate ** (attempt - 1));
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw lastError;
}

/**
 * Builds append-only audit log entry for sensitive parameter access.
 * Example: write output to CloudWatch Logs or Firehose whenever SecureString config is read or updated.
 */
export function buildParameterAuditLog(input: Omit<AuditLogEntry, "at"> & { at?: string }): AuditLogEntry {
  return { ...input, at: input.at ?? new Date().toISOString() };
}

/**
 * Builds least-privilege IAM policy for one app/env parameter path.
 * Example: ECS task role can read `/orders/prod/*` only and must have matching principal tag.
 */
export function parameterPathReadPolicy(pathPrefix: string, region: string, accountId: string, principalTagApp: string): Record<string, unknown> {
  const normalized = pathPrefix.replace(/^\//, "");
  return {
    Version: "2012-10-17",
    Statement: [
      {
        Sid: "ReadScopedParameters",
        Effect: "Allow",
        Action: ["ssm:GetParameter", "ssm:GetParameters", "ssm:GetParametersByPath"],
        Resource: `arn:aws:ssm:${region}:${accountId}:parameter/${normalized}*`,
        Condition: { StringEquals: { "aws:PrincipalTag/app": principalTagApp } },
      },
    ],
  };
}

/**
 * Defines lifecycle and ownership metadata for parameter governance.
 * Example: regulated SecureString parameters require rotation, backup, and longer audit retention.
 */
export function parameterLifecyclePolicy(input: ParameterLifecyclePolicy): ParameterLifecyclePolicy {
  return input;
}

/**
 * Loads complete service runtime config from hierarchical SSM paths.
 * Example: web API reads DB URL, timeout, and feature flags from `/orders/prod/*` at startup.
 */
export async function loadServiceRuntimeConfig(app: string, env: string, ssm?: SSMClient): Promise<ServiceRuntimeConfig> {
  const basePath = `/${app}/${env}`;
  const values = ssm ? await loadConfigByPath(basePath, ssm) : await loadConfigByPath(basePath);
  const featureFlags = ssm
    ? await getJsonParameter<Record<string, boolean>>(parameterPath(app, env, "features"), ssm)
    : await getJsonParameter<Record<string, boolean>>(parameterPath(app, env, "features"));

  return {
    serviceName: app,
    environment: env,
    databaseUrl: values["db-url"] ?? values.databaseUrl ?? "",
    featureFlags,
    apiTimeoutMs: Number(values["api-timeout-ms"] ?? 3000),
  };
}

/**
 * Writes bootstrap config set using String and SecureString parameters.
 * Example: platform pipeline seeds per-environment config before blue/green deployment.
 */
export async function seedServiceRuntimeConfig(config: ServiceRuntimeConfig, ssm?: SSMClient): Promise<void> {
  const base = (key: string) => parameterPath(config.serviceName, config.environment, key);
  await (ssm ? putStringParameter(base("db-url"), config.databaseUrl, true, ssm) : putStringParameter(base("db-url"), config.databaseUrl, true));
  await (ssm ? putJsonParameter(base("features"), config.featureFlags, false, ssm) : putJsonParameter(base("features"), config.featureFlags));
  await (ssm ? putStringParameter(base("api-timeout-ms"), String(config.apiTimeoutMs), false, ssm) : putStringParameter(base("api-timeout-ms"), String(config.apiTimeoutMs)));
}

/**
 * Reads a required parameter and throws clear config error if missing.
 * Example: fail fast during application startup when required DB URL is absent.
 */
export async function getRequiredStringParameter(name: string, ssm?: SSMClient): Promise<string> {
  const value = ssm ? await getStringParameter(name, true, ssm) : await getStringParameter(name);
  if (!value) throw new Error(`Required parameter missing: ${name}`);
  return value;
}

/**
 * Creates disaster-recovery plan for parameter export and restore.
 * Example: nightly job exports `/orders/prod/*` to encrypted S3, then restore job imports into backup region path.
 */
export function parameterDisasterRecoveryPlan(app: string, env: string, backupRegion: string): DisasterRecoveryPlan {
  const sourcePath = `/${app}/${env}`;
  return {
    sourcePath,
    backupPath: `/${app}/${env}-dr`,
    exportBucket: `${app}-${env}-ssm-backup-${backupRegion}`.toLowerCase(),
    restoreRunbook: [
      `Export parameters under ${sourcePath} with names, versions, labels, and SecureString encryption context.`,
      "Store export in encrypted versioned S3 bucket.",
      `Restore into ${backupRegion} under backup path before regional failover.`,
      "Validate required parameters and rotate secrets after restore.",
    ],
    rpoHours: 24,
    rtoHours: 4,
  };
}

/**
 * Builds practical read-cost/latency optimization plan.
 * Example: cache hot Lambda/ECS config reads for 5 minutes and batch path reads during startup.
 */
export function parameterCostOptimizationPlan(path: string, estimatedReadsPerHour: number): CostOptimizationPlan {
  return {
    path,
    estimatedReadsPerHour,
    cacheTtlSeconds: estimatedReadsPerHour > 1000 ? 300 : 60,
    batchReads: estimatedReadsPerHour > 100,
    notes: [
      "Load by path once during startup instead of one SSM call per config key.",
      "Cache immutable config in process memory with controlled TTL.",
      "Use AppConfig or Secrets Manager when rollout/rotation requirements exceed Parameter Store basics.",
    ],
  };
}
