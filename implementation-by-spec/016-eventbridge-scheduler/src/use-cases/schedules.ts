import {
  CreateScheduleCommand,
  DeleteScheduleCommand,
  GetScheduleCommand,
  type SchedulerClient,
} from "@aws-sdk/client-scheduler";
import { client as defaultClient } from "../client.js";
import { EventBridgeSchedulerError } from "../errors.js";

export interface ScheduleRetryPolicy {
  maximumEventAgeInSeconds: number;
  maximumRetryAttempts: number;
}

export interface ScheduleTarget {
  arn: string;
  roleArn: string;
  input?: unknown;
  deadLetterQueueArn?: string;
  retryPolicy?: ScheduleRetryPolicy;
}

export interface ScheduleSpec {
  name: string;
  expression: string;
  target: ScheduleTarget;
  description?: string;
  groupName?: string;
  state?: "ENABLED" | "DISABLED";
  timezone?: string;
  flexibleWindowMinutes?: number;
  actionAfterCompletion?: "NONE" | "DELETE";
}

export interface SchedulerAuditEvent {
  timestamp: string;
  service: "eventbridge-scheduler";
  operation: string;
  scheduleName: string;
  actor: string;
  targetArn?: string;
  outcome: "ALLOW" | "DENY" | "ERROR";
  reason?: string;
  traceId?: string;
  ticketId?: string;
}

export interface ScheduleLifecyclePolicy {
  scheduleName: string;
  owner: string;
  deleteAfterCompletion: boolean;
  retentionDays: number;
  cleanupRequired: boolean;
  backupRequired: boolean;
  disasterRecovery: "none" | "same-region-recreate" | "cross-region-recreate";
}

export interface ScheduleObservabilityPlan {
  metrics: string[];
  alarms: string[];
  logs: string[];
  dashboard: string;
  runbook: string[];
}

export interface SchedulerCostEstimate {
  monthlyInvocations: number;
  estimatedMonthlyUsd: number;
  optimizationTips: string[];
}

export interface TenantScheduleInput {
  tenantId: string;
  jobType: string;
  requestedBy: string;
  traceId: string;
  payload: Record<string, unknown>;
}

function awsErrorName(error: unknown): string {
  if (error instanceof EventBridgeSchedulerError && error.cause instanceof Error) return error.cause.name;
  return error instanceof Error ? error.name : "";
}

function wrapError(operation: string, error: unknown): never {
  const code = awsErrorName(error) || "UNKNOWN";
  throw new EventBridgeSchedulerError(code, `EventBridge Scheduler ${operation} failed`, error);
}

/**
 * Validate schedule name before calling AWS.
 * Use for user-supplied job names, tenant schedules, and generated one-time reminders so CloudWatch and audit logs stay readable.
 * Example: `validateScheduleName("tenant-acme-nightly-export")`.
 */
export function validateScheduleName(name: string): string {
  if (!/^[0-9A-Za-z_.-]{1,64}$/.test(name)) {
    throw new EventBridgeSchedulerError("INVALID_SCHEDULE_NAME", "Schedule name must be 1-64 chars and contain only letters, numbers, dot, dash, or underscore");
  }
  return name;
}

/**
 * Build `rate(n minutes)` expression.
 * Use for frequent jobs like polling, cache refresh, or short operational checks.
 * Example: `everyMinutes(15)` schedules tenant synchronization every 15 minutes.
 */
export function everyMinutes(n: number): string {
  if (!Number.isInteger(n) || n < 1) throw new EventBridgeSchedulerError("INVALID_RATE", "Minute rate must be a positive integer");
  return `rate(${n} minutes)`;
}

/**
 * Build cron expression with UTC timezone semantics unless `timezone` is supplied in `createSchedule`.
 * Use for business calendars, compliance reports, backups, and daily operational workflows.
 * Example: `cronExpression("0", "2")` runs every day at 02:00 UTC.
 */
export function cronExpression(minute: string, hour: string, dayOfMonth = "*", month = "*", dayOfWeek = "?"): string {
  return `cron(${minute} ${hour} ${dayOfMonth} ${month} ${dayOfWeek} *)`;
}

/**
 * Build one-time `at(...)` expression from ISO timestamp.
 * Use for delayed onboarding tasks, trial expiration, contract renewal reminders, and temporary cleanup.
 * Example: `atExpression("2026-01-01T00:00:00Z")` becomes `at(2026-01-01T00:00:00)`.
 */
export function atExpression(atIso: string): string {
  const date = new Date(atIso);
  if (Number.isNaN(date.getTime())) throw new EventBridgeSchedulerError("INVALID_AT_EXPRESSION", "atIso must be a valid ISO timestamp");
  return `at(${atIso.replace(/Z$/, "")})`;
}

/**
 * Build common target object with JSON input, retry policy, and DLQ.
 * Use to invoke Lambda, SQS, Step Functions, or EventBridge targets with safe retries and failure capture.
 * Example: schedule SQS target with tenant job input and DLQ ARN for failed deliveries.
 */
export function scheduleTarget(arn: string, roleArn: string, input?: unknown, options: { deadLetterQueueArn?: string; retryPolicy?: ScheduleRetryPolicy } = {}): ScheduleTarget {
  return { arn, roleArn, input, deadLetterQueueArn: options.deadLetterQueueArn, retryPolicy: options.retryPolicy };
}

/**
 * Create schedule from any supported scheduler expression.
 * Use for generic enterprise jobs where caller controls expression, target, timezone, flexible window, group, and cleanup behavior.
 * Example: create a tenant data export schedule with DLQ, retry policy, audit trace ID, and `ActionAfterCompletion: DELETE`.
 */
export async function createSchedule(
  spec: ScheduleSpec,
  scheduler: SchedulerClient = defaultClient,
) {
  validateScheduleName(spec.name);
  try {
    return await scheduler.send(
      new CreateScheduleCommand({
        Name: spec.name,
        GroupName: spec.groupName,
        Description: spec.description,
        ScheduleExpression: spec.expression,
        ScheduleExpressionTimezone: spec.timezone,
        State: spec.state ?? "ENABLED",
        ActionAfterCompletion: spec.actionAfterCompletion,
        FlexibleTimeWindow: spec.flexibleWindowMinutes
          ? { Mode: "FLEXIBLE", MaximumWindowInMinutes: spec.flexibleWindowMinutes }
          : { Mode: "OFF" },
        Target: {
          Arn: spec.target.arn,
          RoleArn: spec.target.roleArn,
          Input: spec.target.input ? JSON.stringify(spec.target.input) : undefined,
          DeadLetterConfig: spec.target.deadLetterQueueArn ? { Arn: spec.target.deadLetterQueueArn } : undefined,
          RetryPolicy: spec.target.retryPolicy
            ? {
                MaximumEventAgeInSeconds: spec.target.retryPolicy.maximumEventAgeInSeconds,
                MaximumRetryAttempts: spec.target.retryPolicy.maximumRetryAttempts,
              }
            : undefined,
        },
      }),
    );
  } catch (error) {
    wrapError("createSchedule", error);
  }
}

/**
 * Create recurring rate schedule.
 * Use for operational loops like every-15-minute syncs, health checks, or queue draining.
 * Example: `createRateSchedule("inventory-sync", everyMinutes(15), target)`.
 */
export async function createRateSchedule(
  name: string,
  rateExpression: string,
  target: ScheduleTarget,
  scheduler: SchedulerClient = defaultClient,
) {
  return createSchedule({ name, expression: rateExpression, target }, scheduler);
}

/**
 * Create one-time schedule from ISO timestamp.
 * Use for delayed workflows such as subscription expiry, reminder notifications, and temporary resource cleanup.
 * Example: schedule customer trial end handling at exact timestamp and delete schedule after completion.
 */
export async function createOneTimeSchedule(
  name: string,
  atIso: string,
  target: ScheduleTarget,
  scheduler: SchedulerClient = defaultClient,
) {
  return createSchedule({ name, expression: atExpression(atIso), target, actionAfterCompletion: "DELETE" }, scheduler);
}

/**
 * Fetch schedule definition.
 * Use in admin APIs, drift checks, and runbooks to show active target, expression, state, and retry settings.
 * Example: support engineer reads schedule before disabling a stuck tenant export.
 */
export async function getSchedule(name: string, scheduler: SchedulerClient = defaultClient, groupName?: string) {
  try {
    return await scheduler.send(new GetScheduleCommand({ Name: name, GroupName: groupName }));
  } catch (error) {
    wrapError("getSchedule", error);
  }
}

/**
 * Delete schedule; undefined or missing schedules are ignored.
 * Use for idempotent test cleanup, one-time job lifecycle management, and tenant offboarding.
 * Example: cleanup `trial-expiry-acme` even if it already fired and was removed.
 */
export async function deleteSchedule(name: string | undefined, scheduler: SchedulerClient = defaultClient, groupName?: string): Promise<void> {
  if (!name) return;
  try {
    await scheduler.send(new DeleteScheduleCommand({ Name: name, GroupName: groupName }));
  } catch (error) {
    if (awsErrorName(error) === "ResourceNotFoundException") return;
    wrapError("deleteSchedule", error);
  }
}

/**
 * Build standard retry policy for Scheduler target delivery.
 * Use to balance reliability and cost for Lambda, SQS, Step Functions, and API targets.
 * Example: conservative policy retries compliance evidence export for up to 24 hours.
 */
export function createSchedulerRetryPolicy(profile: "fast" | "standard" | "conservative" = "standard"): ScheduleRetryPolicy {
  if (profile === "fast") return { maximumEventAgeInSeconds: 900, maximumRetryAttempts: 3 };
  if (profile === "conservative") return { maximumEventAgeInSeconds: 86_400, maximumRetryAttempts: 185 };
  return { maximumEventAgeInSeconds: 3_600, maximumRetryAttempts: 12 };
}

/**
 * Build tenant-aware schedule payload with traceability.
 * Use when one shared scheduler target processes work for many tenants and must carry audit context.
 * Example: nightly export payload includes tenant ID, job type, requester, trace ID, and filtered payload.
 */
export function buildTenantScheduleInput(input: TenantScheduleInput): TenantScheduleInput {
  if (!input.tenantId || !input.jobType || !input.requestedBy || !input.traceId) {
    throw new EventBridgeSchedulerError("INVALID_TENANT_INPUT", "tenantId, jobType, requestedBy, and traceId are required");
  }
  return input;
}

/**
 * Create structured audit event for schedule administration.
 * Use for create/update/delete approvals, compliance review, tenant offboarding, and break-glass operations.
 * Example: emit `ALLOW` when GRC reviewer creates quarterly access review schedule.
 */
export function createSchedulerAuditEvent(input: Omit<SchedulerAuditEvent, "timestamp" | "service"> & { timestamp?: string }): SchedulerAuditEvent {
  return {
    timestamp: input.timestamp ?? new Date().toISOString(),
    service: "eventbridge-scheduler",
    operation: input.operation,
    scheduleName: input.scheduleName,
    actor: input.actor,
    targetArn: input.targetArn,
    outcome: input.outcome,
    reason: input.reason,
    traceId: input.traceId,
    ticketId: input.ticketId,
  };
}

/**
 * Plan schedule lifecycle, retention, cleanup, backup, and disaster recovery.
 * Use for temporary schedules, regulated recurring jobs, and runbooks that must recreate schedules after regional failure.
 * Example: prod compliance schedule requires backup and cross-region recreate metadata.
 */
export function createScheduleLifecyclePolicy(input: {
  scheduleName: string;
  owner: string;
  environment: "dev" | "test" | "stage" | "prod";
  oneTime?: boolean;
  regulated?: boolean;
}): ScheduleLifecyclePolicy {
  const prod = input.environment === "prod";
  const regulated = input.regulated ?? false;
  return {
    scheduleName: input.scheduleName,
    owner: input.owner,
    deleteAfterCompletion: Boolean(input.oneTime),
    retentionDays: prod ? (regulated ? 2555 : 365) : 30,
    cleanupRequired: Boolean(input.oneTime) || !prod,
    backupRequired: prod || regulated,
    disasterRecovery: prod ? "cross-region-recreate" : regulated ? "same-region-recreate" : "none",
  };
}

/**
 * Create observability checklist for scheduled jobs.
 * Use to connect Scheduler metrics, target DLQ, logs, dashboards, and runbook action to business SLA.
 * Example: alarm when failed invocations or DLQ messages exceed zero for payment retry schedule.
 */
export function createScheduleObservabilityPlan(scheduleName: string, targetService: "lambda" | "sqs" | "step-functions" | "eventbridge"): ScheduleObservabilityPlan {
  return {
    metrics: ["InvocationAttemptCount", "TargetErrorCount", "TargetThrottledCount"],
    alarms: [`${scheduleName}-target-errors`, `${scheduleName}-target-throttles`, `${scheduleName}-dlq-visible-messages`],
    logs: [`/aws/events/scheduler/${scheduleName}`, `/aws/${targetService}/${scheduleName}`],
    dashboard: `${scheduleName}-scheduler-health`,
    runbook: ["Check Scheduler target errors", "Inspect DLQ payloads", "Verify target execution role", "Replay failed event if idempotent"],
  };
}

/**
 * Estimate Scheduler invocation cost and practical optimizations.
 * Use during architecture reviews to compare one schedule per tenant vs batched fan-out worker patterns.
 * Example: 2,000 tenants every 15 minutes can be batched to reduce invocations.
 */
export function estimateSchedulerMonthlyCost(input: { schedules: number; invocationsPerSchedulePerDay: number; pricePerMillionInvocationsUsd?: number }): SchedulerCostEstimate {
  const monthlyInvocations = input.schedules * input.invocationsPerSchedulePerDay * 30;
  const estimatedMonthlyUsd = Number(((monthlyInvocations / 1_000_000) * (input.pricePerMillionInvocationsUsd ?? 1)).toFixed(2));
  const optimizationTips = ["batch low-priority tenant jobs", "use flexible windows to smooth spikes", "delete completed one-time schedules"];
  if (monthlyInvocations > 1_000_000) optimizationTips.push("prefer one schedule that fans out from SQS/EventBridge for tiny tenant jobs");
  return { monthlyInvocations, estimatedMonthlyUsd, optimizationTips };
}

/**
 * Decide whether a one-time schedule should be deleted after firing.
 * Use in cleanup workers that scan old `at(...)` schedules and remove completed temporary jobs.
 * Example: delete trial reminder schedule once fire time is older than one hour.
 */
export function shouldDeleteOneTimeSchedule(expression: string, now = new Date()): boolean {
  const match = /^at\((.+)\)$/.exec(expression);
  if (!match?.[1]) return false;
  return new Date(`${match[1]}Z`).getTime() <= now.getTime();
}
