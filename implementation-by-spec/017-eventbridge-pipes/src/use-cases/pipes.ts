import {
  CreatePipeCommand,
  DeletePipeCommand,
  DescribePipeCommand,
  PipesClient,
  StartPipeCommand,
  StopPipeCommand,
} from "@aws-sdk/client-pipes";
import { client as defaultClient } from "../client.js";
import { EventBridgePipesError } from "../errors.js";

export interface PipeSpec {
  name: string;
  sourceArn: string;
  targetArn: string;
  roleArn: string;
  filterPattern?: Record<string, unknown>;
}

export interface PipeAuditEvent {
  pipeName: string;
  actor: string;
  action: "create" | "start" | "stop" | "delete" | "route" | "deny";
  outcome: "success" | "failed" | "denied";
  at: string;
  details?: Record<string, unknown>;
}

export interface PipeLifecyclePolicy {
  stopIfIdleAfterDays: number;
  deleteIfStoppedAfterDays: number;
}

export interface PipeCostInput {
  pipeCount: number;
  monthlyRequests: number;
  requestPerMillionUsd?: number;
}

const fail = (op: string, e: unknown): never => {
  throw new EventBridgePipesError(e instanceof Error && e.name ? e.name : "UNKNOWN", `EventBridge Pipes ${op} failed`, e);
};

/**
 * Creates EventBridge Pipe from source to target, optionally with source filter criteria.
 *
 * Example: route `order.created` messages from SQS to EventBridge event bus using least-privilege pipe role.
 */
export async function createPipe(spec: PipeSpec, pipes: PipesClient = defaultClient) {
  try {
    return await pipes.send(
      new CreatePipeCommand({
        Name: spec.name,
        Source: spec.sourceArn,
        Target: spec.targetArn,
        RoleArn: spec.roleArn,
        SourceParameters: spec.filterPattern ? { FilterCriteria: { Filters: [{ Pattern: JSON.stringify(spec.filterPattern) }] } } : undefined,
      })
    );
  } catch (e) {
    fail("createPipe", e);
  }
}

/**
 * Reads pipe configuration and current lifecycle state.
 *
 * Example: deployment health check calls this after create/start to verify source, target, and state.
 */
export async function describePipe(name: string, pipes: PipesClient = defaultClient) {
  try {
    return await pipes.send(new DescribePipeCommand({ Name: name }));
  } catch (e) {
    fail("describePipe", e);
  }
}

/**
 * Starts delivery for an existing pipe.
 *
 * Example: after downstream target is deployed, release workflow starts pipe to begin production traffic flow.
 */
export async function startPipe(name: string, pipes: PipesClient = defaultClient) {
  try {
    await pipes.send(new StartPipeCommand({ Name: name }));
  } catch (e) {
    fail("startPipe", e);
  }
}

/**
 * Stops delivery without deleting pipe configuration.
 *
 * Example: incident runbook stops pipe during target outage, then replays source queue after fix.
 */
export async function stopPipe(name: string, pipes: PipesClient = defaultClient) {
  try {
    await pipes.send(new StopPipeCommand({ Name: name }));
  } catch (e) {
    fail("stopPipe", e);
  }
}

/**
 * Deletes pipe; undefined or missing pipes are ignored for idempotent cleanup.
 *
 * Example: test teardown can call `deletePipe` repeatedly without failing when resource is already gone.
 */
export async function deletePipe(name: string | undefined, pipes: PipesClient = defaultClient) {
  if (!name) return;
  try {
    await pipes.send(new DeletePipeCommand({ Name: name }));
  } catch (e) {
    if (e instanceof Error && e.name === "ResourceNotFoundException") return;
    fail("deletePipe", e);
  }
}

/**
 * Builds SQS body filter pattern for EventBridge Pipes.
 *
 * Example: only route queue messages whose JSON body has `{ eventType: "order.created" }`.
 */
export const sqsToEventBusFilter = (eventType: string) => ({ body: { eventType: [eventType] } });

/**
 * Builds multi-tenant event filter for SaaS routing.
 *
 * Example: tenant-specific pipe routes only `tenant-a` invoice events to tenant-owned event bus.
 */
export function tenantEventFilter(tenantId: string, eventTypes: string[]): Record<string, unknown> {
  return { body: { tenantId: [tenantId], eventType: eventTypes } };
}

/**
 * Builds stable pipe name from app, environment, source, and target purpose.
 *
 * Example: `taskflow-prod-orders-to-events` makes IaC, alarms, and audit logs easy to correlate.
 */
export function pipeName(parts: { app: string; environment: string; source: string; target: string }): string {
  return `${parts.app}-${parts.environment}-${parts.source}-to-${parts.target}`.replace(/[^a-zA-Z0-9-_]/g, "-").slice(0, 64);
}

/**
 * Builds structured audit event without source payload data.
 *
 * Example: every start/stop/delete action is logged to CloudWatch/SIEM with actor and sanitized details.
 */
export function pipeAuditEvent(input: Omit<PipeAuditEvent, "at">, now = new Date()): PipeAuditEvent {
  return { ...input, at: now.toISOString() };
}

/**
 * Redacts sensitive role/account/source data before diagnostics.
 *
 * Example: support bundle keeps pipe name and filter while hiding role ARN and full source/target ARNs.
 */
export function redactPipeSpec(spec: PipeSpec): Record<string, unknown> {
  return { ...spec, sourceArn: "[REDACTED]", targetArn: "[REDACTED]", roleArn: "[REDACTED]" };
}

/**
 * Retries transient pipe control-plane operations.
 *
 * Example: CI setup retries `createPipe` during emulator startup or AWS throttling but fails fast on access denied.
 */
export async function withPipeRetry<T>(operation: () => Promise<T>, maxAttempts = 3, baseDelayMs = 50): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      const name = error instanceof Error ? error.name : "";
      if (attempt === maxAttempts || !["ThrottlingException", "TooManyRequestsException", "InternalException", "ServiceUnavailableException"].includes(name)) break;
      await new Promise((resolve) => setTimeout(resolve, baseDelayMs * 2 ** (attempt - 1)));
    }
  }
  throw lastError;
}

/**
 * Decides lifecycle action for idle or stopped pipes.
 *
 * Example: cost-governance job stops idle dev pipes after 7 days and deletes stopped pipes after 30 days.
 */
export function pipeLifecycleDecision(input: {
  state: "RUNNING" | "STOPPED" | "CREATING" | "DELETING" | "STARTING" | "STOPPING" | string;
  lastEventAt?: Date;
  stoppedAt?: Date;
  policy: PipeLifecyclePolicy;
  now?: Date;
}): "keep" | "stop" | "delete" {
  const now = input.now ?? new Date();
  if (input.state === "STOPPED" && input.stoppedAt && daysBetween(input.stoppedAt, now) >= input.policy.deleteIfStoppedAfterDays) return "delete";
  if (input.state === "RUNNING" && input.lastEventAt && daysBetween(input.lastEventAt, now) >= input.policy.stopIfIdleAfterDays) return "stop";
  return "keep";
}

/**
 * Estimates EventBridge Pipes request processing cost.
 *
 * Example: FinOps dashboard forecasts monthly pipe spend from expected SQS message volume.
 */
export function estimatePipeMonthlyCost(input: PipeCostInput): number {
  const requestPerMillionUsd = input.requestPerMillionUsd ?? 0.4;
  return Number(((input.monthlyRequests / 1_000_000) * requestPerMillionUsd).toFixed(2));
}

/**
 * Builds DLQ alarm dimensions/payload for monitoring failed pipe deliveries.
 *
 * Example: command center creates alarm config for `PipeName`, source queue, and target bus.
 */
export function pipeFailureAlarm(pipeNameValue: string, threshold = 1): Record<string, unknown> {
  return { metricName: "PipeDeliveryFailures", pipeName: pipeNameValue, threshold, comparison: "GreaterThanOrEqualToThreshold" };
}

function daysBetween(date: Date, now: Date): number {
  return Math.floor((now.getTime() - date.getTime()) / 86_400_000);
}
