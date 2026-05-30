import {
  CloudWatchLogsClient,
  CreateLogGroupCommand,
  CreateLogStreamCommand,
  DeleteLogGroupCommand,
  FilterLogEventsCommand,
  PutLogEventsCommand,
  PutRetentionPolicyCommand,
  type FilteredLogEvent,
} from "@aws-sdk/client-cloudwatch-logs";
import { client as defaultClient } from "../client.js";
import { CloudWatchLogsError } from "../errors.js";

export interface StructuredLogFields {
  requestId?: string;
  correlationId?: string;
  tenantId?: string;
  service?: string;
  environment?: string;
  [key: string]: unknown;
}

function awsErrorName(error: unknown): string {
  return error instanceof Error && error.name ? error.name : "UNKNOWN";
}

function fail(operation: string, error: unknown): never {
  throw new CloudWatchLogsError(awsErrorName(error), `CloudWatch Logs ${operation} failed`, error);
}

/**
 * Creates log group idempotently.
 * Practical example: platform setup creates `/aws/app/orders-api/prod` before ECS or Lambda deployment.
 */
export async function createLogGroup(name: string, logs: CloudWatchLogsClient = defaultClient): Promise<void> {
  try {
    await logs.send(new CreateLogGroupCommand({ logGroupName: name }));
  } catch (error) {
    if (awsErrorName(error) === "ResourceAlreadyExistsException") return;
    fail("createLogGroup", error);
  }
}

/**
 * Creates log stream idempotently within a log group.
 * Practical example: batch worker creates a deployment-specific stream before publishing startup diagnostics.
 */
export async function createLogStream(group: string, stream: string, logs: CloudWatchLogsClient = defaultClient): Promise<void> {
  try {
    await logs.send(new CreateLogStreamCommand({ logGroupName: group, logStreamName: stream }));
  } catch (error) {
    if (awsErrorName(error) === "ResourceAlreadyExistsException") return;
    fail("createLogStream", error);
  }
}

/**
 * Sets log retention days for lifecycle and cost control.
 * Practical example: keep dev logs for 7 days and regulated prod audit logs for 365 days.
 */
export async function putRetentionDays(group: string, days: number, logs: CloudWatchLogsClient = defaultClient): Promise<void> {
  try {
    await logs.send(new PutRetentionPolicyCommand({ logGroupName: group, retentionInDays: days }));
  } catch (error) {
    fail("putRetentionDays", error);
  }
}

/**
 * Writes one JSON log event to a CloudWatch Logs stream.
 * Practical example: API handler publishes structured order/payment event with correlation and tenant IDs.
 */
export async function putJsonLog(group: string, stream: string, event: unknown, logs: CloudWatchLogsClient = defaultClient): Promise<void> {
  try {
    await logs.send(
      new PutLogEventsCommand({
        logGroupName: group,
        logStreamName: stream,
        logEvents: [{ timestamp: Date.now(), message: JSON.stringify(event) }],
      }),
    );
  } catch (error) {
    fail("putJsonLog", error);
  }
}

/**
 * Filters log events using CloudWatch Logs filter pattern syntax.
 * Practical example: find `ERROR` events for one tenant during incident triage.
 */
export async function filterLogs(group: string, pattern: string, logs: CloudWatchLogsClient = defaultClient): Promise<FilteredLogEvent[]> {
  try {
    return (await logs.send(new FilterLogEventsCommand({ logGroupName: group, filterPattern: pattern }))).events ?? [];
  } catch (error) {
    fail("filterLogs", error);
  }
}

/**
 * Deletes log group idempotently.
 * Practical example: integration tests and preview environments clean up generated log groups safely.
 */
export async function deleteLogGroup(group: string | undefined, logs: CloudWatchLogsClient = defaultClient): Promise<void> {
  if (!group) return;
  try {
    await logs.send(new DeleteLogGroupCommand({ logGroupName: group }));
  } catch (error) {
    if (awsErrorName(error) === "ResourceNotFoundException") return;
    fail("deleteLogGroup", error);
  }
}

/**
 * Builds normalized JSON log object with timestamp and extra fields.
 * Practical example: all services log same `level`, `message`, `time`, `tenantId`, and `correlationId` fields.
 */
export function structuredLog(level: string, message: string, fields: StructuredLogFields = {}): Record<string, unknown> {
  return { level, message, time: new Date().toISOString(), ...fields };
}

/**
 * Builds standard enterprise log group name.
 * Practical example: `/aws/app/payments-api/prod` groups all production service logs consistently.
 */
export function appLogGroupName(app: string, environment: string): string {
  return `/aws/app/${app}/${environment}`;
}

/**
 * Builds safe log stream name for instance, container, or deployment identifier.
 * Practical example: ECS task `task/abc:blue` becomes `task-abc-blue` for stream naming.
 */
export function safeLogStreamName(component: string, instanceId: string): string {
  return `${component}/${instanceId}`.replace(/[^a-zA-Z0-9/_-]/g, "-");
}

/**
 * Builds CloudWatch JSON filter pattern for exact field matches.
 * Practical example: `{ $.tenantId = "tenant-a" && $.level = "ERROR" }` powers incident search and metric filters.
 */
export function jsonFilterPattern(fields: Record<string, string | number | boolean>): string {
  const conditions = Object.entries(fields).map(([key, value]) => `$.${key} = ${typeof value === "string" ? `"${value}"` : String(value)}`);
  return `{ ${conditions.join(" && ")} }`;
}
