import {
  CreateScheduleCommand,
  DeleteScheduleCommand,
  GetScheduleCommand,
  type SchedulerClient,
} from "@aws-sdk/client-scheduler";
import { client as defaultClient } from "../client.js";
import { EventBridgeSchedulerError } from "../errors.js";

export interface ScheduleTarget {
  arn: string;
  roleArn: string;
  input?: unknown;
}

export interface ScheduleSpec {
  name: string;
  expression: string;
  target: ScheduleTarget;
  description?: string;
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
 * Build `rate(n minutes)` expression.
 *
 * @example
 * const expression = everyMinutes(5);
 */
export function everyMinutes(n: number): string {
  return `rate(${n} minutes)`;
}

/**
 * Build cron expression with UTC timezone semantics.
 *
 * @example
 * const expression = cronExpression("0", "12", "*", "*", "?");
 */
export function cronExpression(minute: string, hour: string, dayOfMonth = "*", month = "*", dayOfWeek = "?"): string {
  return `cron(${minute} ${hour} ${dayOfMonth} ${month} ${dayOfWeek} *)`;
}

/**
 * Build one-time `at(...)` expression from ISO string.
 *
 * @example
 * const expression = atExpression("2026-01-01T00:00:00Z");
 */
export function atExpression(atIso: string): string {
  return `at(${atIso.replace(/Z$/, "")})`;
}

/**
 * Create schedule from any supported scheduler expression.
 *
 * @example
 * await createSchedule({ name: "job", expression: everyMinutes(5), target });
 */
export async function createSchedule(
  spec: ScheduleSpec,
  scheduler: SchedulerClient = defaultClient
) {
  try {
    return await scheduler.send(
      new CreateScheduleCommand({
        Name: spec.name,
        Description: spec.description,
        ScheduleExpression: spec.expression,
        FlexibleTimeWindow: { Mode: "OFF" },
        Target: {
          Arn: spec.target.arn,
          RoleArn: spec.target.roleArn,
          Input: spec.target.input ? JSON.stringify(spec.target.input) : undefined,
        },
      })
    );
  } catch (error) {
    wrapError("createSchedule", error);
  }
}

/**
 * Create recurring rate schedule.
 *
 * @example
 * await createRateSchedule("every-five", everyMinutes(5), target);
 */
export async function createRateSchedule(
  name: string,
  rateExpression: string,
  target: ScheduleTarget,
  scheduler: SchedulerClient = defaultClient
) {
  return createSchedule({ name, expression: rateExpression, target }, scheduler);
}

/**
 * Create one-time schedule from ISO timestamp.
 *
 * @example
 * await createOneTimeSchedule("run-once", "2026-01-01T00:00:00Z", target);
 */
export async function createOneTimeSchedule(
  name: string,
  atIso: string,
  target: ScheduleTarget,
  scheduler: SchedulerClient = defaultClient
) {
  return createSchedule({ name, expression: atExpression(atIso), target }, scheduler);
}

/**
 * Fetch schedule definition.
 *
 * @example
 * const schedule = await getSchedule("every-five");
 */
export async function getSchedule(name: string, scheduler: SchedulerClient = defaultClient) {
  try {
    return await scheduler.send(new GetScheduleCommand({ Name: name }));
  } catch (error) {
    wrapError("getSchedule", error);
  }
}

/**
 * Delete schedule; undefined or missing schedules are ignored.
 *
 * @example
 * await deleteSchedule("every-five");
 */
export async function deleteSchedule(name: string | undefined, scheduler: SchedulerClient = defaultClient): Promise<void> {
  if (!name) return;
  try {
    await scheduler.send(new DeleteScheduleCommand({ Name: name }));
  } catch (error) {
    if (awsErrorName(error) === "ResourceNotFoundException") return;
    wrapError("deleteSchedule", error);
  }
}

/**
 * Build common target object with JSON input.
 *
 * @example
 * const target = scheduleTarget(queueArn, roleArn, { task: "sync" });
 */
export function scheduleTarget(arn: string, roleArn: string, input?: unknown): ScheduleTarget {
  return { arn, roleArn, input };
}
