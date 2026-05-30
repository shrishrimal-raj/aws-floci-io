import type { SFNClient } from "@aws-sdk/client-sfn";
import { startExecution } from "./workflows.js";

export interface WorkflowActor {
  tenantId: string;
  principalId: string;
  roles: string[];
  requestId: string;
}

export interface WorkflowInput<TPayload> {
  tenantId: string;
  workflowName: string;
  payload: TPayload;
  correlationId?: string;
  idempotencyKey?: string;
  requestedAt?: string;
  schemaVersion?: string;
}

export interface AuditRecord {
  tenantId: string;
  principalId: string;
  workflowName: string;
  action: string;
  outcome: "attempt" | "started" | "denied" | "failed";
  requestId: string;
  correlationId: string;
  reason?: string;
  at: string;
}

export interface RetryOptions {
  attempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  jitterRatio?: number;
  random?: () => number;
  sleep?: (ms: number) => Promise<void>;
  shouldRetry?: (error: unknown, attempt: number) => boolean;
  onRetry?: (error: unknown, attempt: number, delayMs: number) => void;
}

export interface WorkflowObservabilityPlan {
  workflowName: string;
  metrics: string[];
  alarms: string[];
  logFields: string[];
  dashboardWidgets: string[];
}

export interface WorkflowCostEstimate {
  executions: number;
  averageTransitions: number;
  totalTransitions: number;
  estimatedStandardCostUsd: number;
}

export interface WorkflowLifecyclePlan {
  workflowName: string;
  executionHistoryRetentionDays: number;
  auditRetentionDays: number;
  payloadRetentionDays: number;
  piiRedactionRequired: boolean;
}

export interface WorkflowDisasterRecoveryPlan {
  workflowName: string;
  strategy: "redeploy-asl" | "cross-region-standby" | "active-active";
  rpoMinutes: number;
  rtoMinutes: number;
  stateRecovery: string[];
}

export interface ComplianceControl {
  framework: "SOC2" | "HIPAA" | "PCI" | "GDPR";
  control: string;
  implementation: string;
}

/**
 * Enforces tenant isolation and role authorization before starting workflows.
 * Example: tenant-a support user cannot start tenant-b refund workflow or admin-only remediation workflow.
 */
export function assertWorkflowAccess(actor: WorkflowActor, resourceTenantId: string, requiredRole = "workflow:start"): void {
  if (actor.tenantId !== resourceTenantId) throw new Error("tenant access denied");
  if (!actor.roles.includes(requiredRole) && !actor.roles.includes("admin")) throw new Error("role access denied");
}

/**
 * Creates a durable execution input envelope with tenant, schema, correlation, and idempotency metadata.
 * Example: checkout API wraps order payload so every Lambda task receives consistent tracing and tenant context.
 */
export function workflowInput<TPayload>(input: WorkflowInput<TPayload>): WorkflowInput<TPayload> & { correlationId: string; idempotencyKey: string; requestedAt: string; schemaVersion: string } {
  const correlationId = input.correlationId ?? `${input.tenantId}-${Date.now()}`;
  return {
    ...input,
    correlationId,
    idempotencyKey: input.idempotencyKey ?? correlationId,
    requestedAt: input.requestedAt ?? new Date().toISOString(),
    schemaVersion: input.schemaVersion ?? "1.0",
  };
}

/**
 * Creates structured audit records for workflow starts, failures, and denied access.
 * Example: write records to CloudWatch Logs, EventBridge audit bus, or DynamoDB audit table.
 */
export function workflowAuditRecord(actor: WorkflowActor, workflowName: string, action: string, outcome: AuditRecord["outcome"], correlationId: string, reason?: string): AuditRecord {
  return {
    tenantId: actor.tenantId,
    principalId: actor.principalId,
    workflowName,
    action,
    outcome,
    requestId: actor.requestId,
    correlationId,
    reason,
    at: new Date().toISOString(),
  };
}

/**
 * Retries transient Step Functions SDK calls with exponential backoff and jitter.
 * Example: retry throttled StartExecution calls while surfacing AccessDenied and validation failures immediately.
 */
export async function retryWithBackoff<T>(operation: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const attempts = options.attempts ?? 3;
  const baseDelayMs = options.baseDelayMs ?? 100;
  const maxDelayMs = options.maxDelayMs ?? 2_000;
  const jitterRatio = options.jitterRatio ?? 0.2;
  const random = options.random ?? Math.random;
  const sleep = options.sleep ?? ((ms) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  const shouldRetry = options.shouldRetry ?? ((error) => ["ThrottlingException", "TooManyRequestsException", "ServiceUnavailable", "InternalFailure"].some((name) => String(error).includes(name)));

  for (let attempt = 1; ; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt >= attempts || !shouldRetry(error, attempt)) throw error;
      const delayMs = Math.round(Math.min(maxDelayMs, baseDelayMs * 2 ** (attempt - 1)) * (1 + jitterRatio * random()));
      options.onRetry?.(error, attempt, delayMs);
      await sleep(delayMs);
    }
  }
}

/**
 * Authorizes, envelopes, audits, retries, and starts a Step Functions execution.
 * Example: order API starts fulfillment workflow with tenant-safe metadata and retry protection.
 */
export async function startEnterpriseExecution<TPayload>(actor: WorkflowActor, stateMachineArn: string, input: WorkflowInput<TPayload>, sfn?: SFNClient, retry: RetryOptions = {}): Promise<{ executionArn: string; audit: AuditRecord; input: ReturnType<typeof workflowInput<TPayload>> }> {
  assertWorkflowAccess(actor, input.tenantId);
  const executionInput = workflowInput(input);
  const executionArn = await retryWithBackoff(() => startExecution(stateMachineArn, executionInput, sfn), retry);
  return {
    executionArn,
    audit: workflowAuditRecord(actor, input.workflowName, "workflow.start", "started", executionInput.correlationId),
    input: executionInput,
  };
}

/**
 * Defines CloudWatch metrics, alarms, logs, and dashboard widgets for workflow operations.
 * Example: alert when order workflow failures spike, executions time out, or execution throttling appears.
 */
export function workflowObservabilityPlan(workflowName: string): WorkflowObservabilityPlan {
  return {
    workflowName,
    metrics: ["ExecutionsStarted", "ExecutionsSucceeded", "ExecutionsFailed", "ExecutionsTimedOut", "ExecutionThrottled", "StateTransitionCount"],
    alarms: [`${workflowName}-failed-executions`, `${workflowName}-timed-out-executions`, `${workflowName}-execution-throttled`, `${workflowName}-high-transition-count`],
    logFields: ["tenantId", "workflowName", "executionArn", "correlationId", "idempotencyKey", "requestId", "outcome"],
    dashboardWidgets: ["execution-status", "p95-duration", "failure-rate", "state-transitions", "estimated-cost"],
  };
}

/**
 * Estimates Standard Workflow transition cost for planning and architecture reviews.
 * Example: 100k order executions with 12 transitions estimates monthly Step Functions cost.
 */
export function estimateStandardWorkflowCost(executions: number, averageTransitions: number, pricePerThousandTransitionsUsd = 0.025): WorkflowCostEstimate {
  const totalTransitions = executions * averageTransitions;
  return { executions, averageTransitions, totalTransitions, estimatedStandardCostUsd: (totalTransitions / 1_000) * pricePerThousandTransitionsUsd };
}

/**
 * Captures execution, audit, and payload retention decisions for compliance.
 * Example: regulated payment workflow redacts PII payloads early but keeps audit records 7 years.
 */
export function workflowLifecyclePlan(workflowName: string, auditRetentionDays = 2_555, payloadRetentionDays = 30): WorkflowLifecyclePlan {
  return { workflowName, executionHistoryRetentionDays: 90, auditRetentionDays, payloadRetentionDays, piiRedactionRequired: true };
}

/**
 * Defines backup/disaster recovery posture for workflow definitions and in-flight state.
 * Example: store ASL in Git, redeploy to standby region, recover unfinished work from idempotent business records.
 */
export function workflowDisasterRecoveryPlan(workflowName: string, strategy: WorkflowDisasterRecoveryPlan["strategy"] = "cross-region-standby"): WorkflowDisasterRecoveryPlan {
  return {
    workflowName,
    strategy,
    rpoMinutes: strategy === "active-active" ? 1 : 15,
    rtoMinutes: strategy === "active-active" ? 5 : 60,
    stateRecovery: ["version ASL in Git", "replicate Lambda/container artifacts", "persist business state outside workflow", "restart idempotently from last committed business step"],
  };
}

/**
 * Maps compliance requirements to concrete Step Functions implementation practices.
 * Example: SOC2 workflow evidence includes IAM least privilege, audit logs, encrypted payload storage, and restore drills.
 */
export function workflowComplianceControls(framework: ComplianceControl["framework"] = "SOC2"): ComplianceControl[] {
  return [
    { framework, control: "Least privilege orchestration", implementation: "State machine role can invoke only required Lambda/ECS/SNS/SQS resources" },
    { framework, control: "Auditability", implementation: "Structured audit records include tenantId, principalId, workflowName, executionArn, correlationId, outcome" },
    { framework, control: "Data minimization", implementation: "Store only identifiers in workflow input; keep PII in encrypted systems of record" },
    { framework, control: "Resilience evidence", implementation: "Version ASL, alarm on failures, test replay/idempotency and regional redeploy" },
  ];
}
