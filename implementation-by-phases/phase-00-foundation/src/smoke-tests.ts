import { CreateBucketCommand, DeleteBucketCommand, ListBucketsCommand } from "@aws-sdk/client-s3";
import { CreateQueueCommand, DeleteQueueCommand, ListQueuesCommand } from "@aws-sdk/client-sqs";
import {
  CreateTableCommand,
  DeleteTableCommand,
  ListTablesCommand,
  waitUntilTableExists,
} from "@aws-sdk/client-dynamodb";
import { createClient, getFlociHealth } from "@floci-lab/aws-clients";

export type SmokeStatus = "pass" | "fail";

export interface SmokeResult {
  name: string;
  status: SmokeStatus;
  detail: string;
  ms: number;
}

/**
 * Runs Phase 00 health checks in parallel against Floci/local AWS services.
 * Example: call from CI before running higher-phase integration tests.
 */
export async function runFlociSmokeTests(): Promise<SmokeResult[]> {
  return Promise.all([checkHealth(), checkS3(), checkSqs(), checkDynamoDb()]);
}

/**
 * Converts detailed check results into one deployment gate boolean.
 * Example: fail a pipeline when any required local service cannot create/list/delete resources.
 */
export function allPassed(results: SmokeResult[]): boolean {
  return results.every((result) => result.status === "pass");
}

/**
 * Renders smoke-test output as a compact operator status board.
 * Example: print green/red rows in local labs, onboarding docs, and CI logs.
 */
export function renderStatusBoard(results: SmokeResult[]): string {
  const width = Math.max(...results.map((result) => result.name.length), "service".length);
  const lines = ["service".padEnd(width) + " | status | detail"];
  lines.push("-".repeat(width) + "-|-" + "-".repeat(6) + "-|-" + "-".repeat(40));
  for (const result of results) {
    const icon = result.status === "pass" ? "green" : "red";
    lines.push(`${result.name.padEnd(width)} | ${icon.padEnd(6)} | ${result.detail} (${result.ms}ms)`);
  }
  return lines.join("\n");
}

async function timed(name: string, fn: () => Promise<string>): Promise<SmokeResult> {
  const start = Date.now();
  try {
    return { name, status: "pass", detail: await fn(), ms: Date.now() - start };
  } catch (error) {
    return {
      name,
      status: "fail",
      detail: error instanceof Error ? error.message : String(error),
      ms: Date.now() - start,
    };
  }
}

async function checkHealth(): Promise<SmokeResult> {
  return timed("floci", async () => {
    const health = await getFlociHealth();
    if (!health.ok) throw new Error(`health endpoint returned ${health.status}`);
    return health.services.length ? `${health.services.length} services registered` : "health endpoint ok";
  });
}

async function checkS3(): Promise<SmokeResult> {
  return timed("s3", async () => {
    const s3 = createClient("s3");
    const bucket = `phase-00-${Date.now()}`;
    await s3.send(new CreateBucketCommand({ Bucket: bucket }));
    const listed = await s3.send(new ListBucketsCommand({}));
    await s3.send(new DeleteBucketCommand({ Bucket: bucket }));
    if (!listed.Buckets?.some((item) => item.Name === bucket)) throw new Error("created bucket missing");
    return `created/listed/deleted ${bucket}`;
  });
}

async function checkSqs(): Promise<SmokeResult> {
  return timed("sqs", async () => {
    const sqs = createClient("sqs");
    const queueName = `phase-00-${Date.now()}`;
    const created = await sqs.send(new CreateQueueCommand({ QueueName: queueName }));
    const listed = await sqs.send(new ListQueuesCommand({ QueueNamePrefix: queueName }));
    if (created.QueueUrl) await sqs.send(new DeleteQueueCommand({ QueueUrl: created.QueueUrl }));
    if (!listed.QueueUrls?.some((url) => url.includes(queueName))) throw new Error("created queue missing");
    return `created/listed/deleted ${queueName}`;
  });
}

async function checkDynamoDb(): Promise<SmokeResult> {
  return timed("dynamodb", async () => {
    const dynamodb = createClient("dynamodb");
    const tableName = `phase_00_${Date.now()}`;
    await dynamodb.send(
      new CreateTableCommand({
        TableName: tableName,
        BillingMode: "PAY_PER_REQUEST",
        AttributeDefinitions: [{ AttributeName: "pk", AttributeType: "S" }],
        KeySchema: [{ AttributeName: "pk", KeyType: "HASH" }],
      })
    );
    await waitUntilTableExists({ client: dynamodb, maxWaitTime: 10 }, { TableName: tableName });
    const listed = await dynamodb.send(new ListTablesCommand({}));
    await dynamodb.send(new DeleteTableCommand({ TableName: tableName }));
    if (!listed.TableNames?.includes(tableName)) throw new Error("created table missing");
    return `created/listed/deleted ${tableName}`;
  });
}
