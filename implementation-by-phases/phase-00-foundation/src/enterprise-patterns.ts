import { awsDefaults, type AwsClientOptions } from "@floci-lab/aws-clients";
import { parseArn } from "./aws-mental-model.js";
import type { SmokeResult } from "./smoke-tests.js";

export interface EnterpriseResourceContext {
  application: string;
  environment: "dev" | "test" | "stage" | "prod";
  owner: string;
  costCenter: string;
  dataClassification: "public" | "internal" | "confidential" | "restricted";
}

export interface AuditEvent {
  id: string;
  at: string;
  actor: string;
  action: string;
  resourceArn: string;
  accountId: string;
  service: string;
  region: string;
  result: "success" | "failure";
  metadata: Record<string, string | number | boolean>;
}

export interface RetryPolicy {
  attempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  retryableErrors: string[];
}

export type FoundationService = "floci" | "s3" | "dynamodb" | "sqs";

export interface LifecyclePlan {
  service: "s3" | "dynamodb" | "sqs";
  retentionDays: number;
  backupRequired: boolean;
  disasterRecovery: "none" | "same-region" | "cross-region";
  costControls: string[];
  complianceNotes: string[];
}

export interface ObservabilityPlan {
  service: FoundationService;
  logs: string[];
  metrics: string[];
  alarms: string[];
  dashboardWidgets: string[];
}

export interface ComplianceControl {
  id: string;
  title: string;
  appliesTo: FoundationService[];
  evidence: string;
}

export interface ReadinessSummary {
  passed: boolean;
  total: number;
  failed: number;
  slowestService: string;
  failedServices: string[];
  recommendation: string;
}

const defaultRetryPolicy: RetryPolicy = {
  attempts: 3,
  baseDelayMs: 100,
  maxDelayMs: 1_000,
  retryableErrors: ["TimeoutError", "ThrottlingException", "TooManyRequestsException", "ServiceUnavailable"],
};

/**
 * Builds consistent enterprise tags for cost allocation, ownership, compliance, and cleanup automation.
 * Example: tag every S3 bucket, DynamoDB table, and SQS queue with app/env/owner/cost-center before deployment.
 */
export function buildEnterpriseTags(
  context: EnterpriseResourceContext,
  extra: Record<string, string> = {}
): Record<string, string> {
  return {
    Application: context.application,
    Environment: context.environment,
    Owner: context.owner,
    CostCenter: context.costCenter,
    DataClassification: context.dataClassification,
    ManagedBy: "floci-phase-00",
    ...extra,
  };
}

/**
 * Creates structured audit events from ARNs so logs can be filtered by AWS account, region, service, action, and actor.
 * Example: emit one event after creating a queue and another event when cleanup deletes it.
 */
export function createAuditEvent(input: {
  actor: string;
  action: string;
  resourceArn: string;
  result: "success" | "failure";
  metadata?: Record<string, string | number | boolean>;
  now?: Date;
}): AuditEvent {
  const parts = parseArn(input.resourceArn);
  return {
    id: `${input.action}-${parts.service}-${input.now?.getTime() ?? Date.now()}`,
    at: (input.now ?? new Date()).toISOString(),
    actor: input.actor,
    action: input.action,
    resourceArn: input.resourceArn,
    accountId: maskAccountId(parts.accountId),
    service: parts.service,
    region: parts.region,
    result: input.result,
    metadata: input.metadata ?? {},
  };
}

/**
 * Masks AWS account ids before writing operator-facing logs or demo output.
 * Example: 123456789012 becomes ********9012 while still allowing support teams to identify the account.
 */
export function maskAccountId(accountId: string): string {
  if (!/^\d{12}$/.test(accountId)) return accountId ? "invalid-account" : "unknown-account";
  return `${"*".repeat(8)}${accountId.slice(-4)}`;
}

/**
 * Wraps AWS SDK calls with bounded exponential backoff for transient infrastructure errors.
 * Example: use around ListBucketsCommand, SendMessageCommand, or DescribeTableCommand in CI smoke checks.
 */
export async function withRetry<T>(operation: () => Promise<T>, policy: Partial<RetryPolicy> = {}): Promise<T> {
  const resolved: RetryPolicy = { ...defaultRetryPolicy, ...policy };
  let lastError: unknown;

  for (let attempt = 1; attempt <= resolved.attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      const name = error instanceof Error ? error.name : String(error);
      const retryable = resolved.retryableErrors.includes(name);
      if (!retryable || attempt === resolved.attempts) break;
      await delay(Math.min(resolved.maxDelayMs, resolved.baseDelayMs * 2 ** (attempt - 1)));
    }
  }

  throw lastError;
}

/**
 * Produces safe AWS SDK defaults for enterprise apps while preserving Floci/local endpoint overrides.
 * Example: prod services pass region/maxAttempts explicitly; local labs keep http://localhost:4566 credentials.
 */
export function enterpriseClientDefaults(options: AwsClientOptions = {}) {
  return awsDefaults({ maxAttempts: 5, ...options });
}

/**
 * Documents valid lifecycle, backup, disaster-recovery, compliance, and cost choices for core Phase 00 services.
 * Example: generate this plan in architecture reviews before adding buckets, queues, or tables.
 */
export function lifecyclePlanFor(service: LifecyclePlan["service"], environment: EnterpriseResourceContext["environment"]): LifecyclePlan {
  const prod = environment === "prod";

  if (service === "s3") {
    return {
      service,
      retentionDays: prod ? 365 : 30,
      backupRequired: prod,
      disasterRecovery: prod ? "cross-region" : "same-region",
      costControls: ["lifecycle-expiration", "intelligent-tiering", "request-metrics-review"],
      complianceNotes: ["enable-encryption", "block-public-access", "log-object-access"],
    };
  }

  if (service === "dynamodb") {
    return {
      service,
      retentionDays: prod ? 2555 : 14,
      backupRequired: prod,
      disasterRecovery: prod ? "cross-region" : "same-region",
      costControls: ["on-demand-for-spiky-load", "ttl-for-expired-items", "review-gsi-cardinality"],
      complianceNotes: ["enable-point-in-time-recovery", "least-privilege-iam", "audit-data-access"],
    };
  }

  return {
    service,
    retentionDays: prod ? 14 : 3,
    backupRequired: false,
    disasterRecovery: "same-region",
    costControls: ["short-retention", "dead-letter-queue", "batch-consumers"],
    complianceNotes: ["encrypt-messages", "redrive-failed-events", "audit-producer-identity"],
  };
}

/**
 * Creates observability requirements for local and production-like foundation services.
 * Example: turn smoke-test outputs into dashboard widgets and alarms before onboarding teams.
 */
export function observabilityPlanFor(services: FoundationService[]): ObservabilityPlan[] {
  return services.map((service) => ({
    service,
    logs: service === "floci" ? ["health-check-log", "startup-log"] : [`${service}-sdk-call-log`, `${service}-error-log`],
    metrics:
      service === "floci"
        ? ["health_status", "registered_services"]
        : [`${service}_request_count`, `${service}_error_count`, `${service}_latency_ms`],
    alarms:
      service === "floci"
        ? ["health endpoint unavailable"]
        : [`${service} smoke check failed`, `${service} p95 latency above baseline`],
    dashboardWidgets:
      service === "floci"
        ? ["health status", "service registry count"]
        : [`${service} success rate`, `${service} latency`, `${service} recent errors`],
  }));
}

/**
 * Maps foundation services to beginner-friendly compliance controls and evidence sources.
 * Example: use in README, architecture reviews, or onboarding checklists to prove secure defaults exist.
 */
export function complianceControlsFor(services: FoundationService[]): ComplianceControl[] {
  const selected = new Set(services);
  const controls: ComplianceControl[] = [
    {
      id: "FOUNDATION-001",
      title: "Local credentials are dummy-only when endpoint override is used",
      appliesTo: ["s3", "dynamodb", "sqs"],
      evidence: "awsDefaults() returns test credentials only when AWS_ENDPOINT_URL is present.",
    },
    {
      id: "FOUNDATION-002",
      title: "Resource operations are smoke-tested before higher phase integration",
      appliesTo: ["floci", "s3", "dynamodb", "sqs"],
      evidence: "runFlociSmokeTests() checks health plus create/list/delete lifecycles.",
    },
    {
      id: "FOUNDATION-003",
      title: "Audit output masks account ids",
      appliesTo: ["s3", "dynamodb", "sqs"],
      evidence: "createAuditEvent() stores masked account ids from ARNs.",
    },
  ];

  return controls.filter((control) => control.appliesTo.some((service) => selected.has(service)));
}

/**
 * Converts smoke-test rows into an action-oriented readiness report for CI and local onboarding.
 * Example: print this summary after renderStatusBoard() to tell developers what to fix first.
 */
export function summarizeReadiness(results: SmokeResult[]): ReadinessSummary {
  const failedServices = results.filter((result) => result.status === "fail").map((result) => result.name);
  const slowest = results.reduce<SmokeResult | undefined>(
    (current, result) => (!current || result.ms > current.ms ? result : current),
    undefined
  );

  return {
    passed: failedServices.length === 0,
    total: results.length,
    failed: failedServices.length,
    slowestService: slowest?.name ?? "none",
    failedServices,
    recommendation:
      failedServices.length === 0
        ? "Foundation ready. Continue to higher-phase integration tests."
        : `Fix failed services first: ${failedServices.join(", ")}. Check Floci container and endpoint credentials.`,
  };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
