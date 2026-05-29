import {
  DescribeStreamCommand,
  GetRecordsCommand,
  GetShardIteratorCommand,
  ListStreamsCommand,
  type _Record as StreamRecord,
  type DynamoDBStreamsClient,
  type AttributeValue,
  type OperationType,
  type _Stream as Stream,
  type StreamDescription,
} from "@aws-sdk/client-dynamodb-streams";
import { client as defaultClient } from "../client.js";
import { DynamoDBStreamsError } from "../errors.js";

export interface StreamRecordSummary {
  eventName?: OperationType;
  keys?: Record<string, AttributeValue>;
  newImage?: Record<string, AttributeValue>;
  oldImage?: Record<string, AttributeValue>;
  sequenceNumber?: string;
  approximateCreationDateTime?: Date;
}

export interface ShardReadResult {
  shardId: string;
  records: StreamRecord[];
  nextShardIterator?: string;
}

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export interface StreamAuditEvent {
  eventId: string;
  timestamp: string;
  eventName?: OperationType;
  sequenceNumber?: string;
  tableKey: string;
  action: string;
  outcome: "PROCESSED" | "SKIPPED" | "FAILED";
  tenantId?: string;
  traceId?: string;
  reason?: string;
}

export interface StreamProcessorResult {
  received: number;
  processed: number;
  skipped: number;
  failed: number;
}

export interface StreamLagSnapshot {
  recordCount: number;
  oldestRecordAgeMs: number;
  newestRecordAgeMs: number;
  alarmHints: string[];
}

export interface StreamConsumerCostEstimateInput {
  recordsPerMonth: number;
  batchSize?: number;
  lambdaRequestUsdPerMillion?: number;
}

export interface StreamConsumerCostEstimate {
  estimatedInvocations: number;
  requestUsd: number;
}

function awsErrorName(error: unknown): string {
  if (error instanceof DynamoDBStreamsError && error.cause instanceof Error)
    return error.cause.name;
  return error instanceof Error ? error.name : "";
}

function wrapError(operation: string, error: unknown): never {
  const code = awsErrorName(error) || "UNKNOWN";
  throw new DynamoDBStreamsError(
    code,
    `DynamoDB Streams ${operation} failed`,
    error,
  );
}

function fromAttribute(value: AttributeValue): JsonValue {
  if ("S" in value && value.S !== undefined) return value.S;
  if ("N" in value && value.N !== undefined) return Number(value.N);
  if ("BOOL" in value && value.BOOL !== undefined) return value.BOOL;
  if ("NULL" in value && value.NULL) return null;
  if ("L" in value && value.L) return value.L.map(fromAttribute);
  if ("M" in value && value.M)
    return Object.fromEntries(
      Object.entries(value.M).map(([key, item]) => [key, fromAttribute(item)]),
    );
  return null;
}

/**
 * Convert DynamoDB AttributeValue map to plain JSON for logs, projections, and tests.
 *
 * @example
 * const json = attributeMapToJson(record.dynamodb?.NewImage);
 */
export function attributeMapToJson(
  item: Record<string, AttributeValue> | undefined,
): Record<string, JsonValue> {
  if (!item) return {};
  return Object.fromEntries(
    Object.entries(item).map(([key, value]) => [key, fromAttribute(value)]),
  );
}

/**
 * Build stable idempotency key for stream consumers.
 *
 * @example
 * const key = streamRecordIdempotencyKey(record);
 */
export function streamRecordIdempotencyKey(record: StreamRecord): string {
  const sequence = record.dynamodb?.SequenceNumber ?? "unknown";
  const keys = attributeMapToJson(record.dynamodb?.Keys);
  const keyText = Object.entries(keys)
    .map(([key, value]) => `${key}=${String(value)}`)
    .join("#");
  return `ddb-stream#${record.eventName ?? "UNKNOWN"}#${keyText}#${sequence}`;
}

/**
 * Create structured audit event for stream processor logs or compliance sinks.
 *
 * @example
 * const audit = createStreamAuditEvent(record, "ProjectUser", "PROCESSED");
 */
export function createStreamAuditEvent(
  record: StreamRecord,
  action: string,
  outcome: StreamAuditEvent["outcome"],
  extra: Pick<StreamAuditEvent, "tenantId" | "traceId" | "reason"> = {},
): StreamAuditEvent {
  const keys = attributeMapToJson(record.dynamodb?.Keys);
  return {
    eventId: `ddb-stream-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    timestamp: new Date().toISOString(),
    eventName: record.eventName,
    sequenceNumber: record.dynamodb?.SequenceNumber,
    tableKey: JSON.stringify(keys),
    action,
    outcome,
    ...extra,
  };
}

/**
 * Estimate Lambda request cost for stream event source mapping invocations.
 * DynamoDB Streams itself has no separate charge when consumed by Lambda; verify full Lambda duration costs separately.
 *
 * @example
 * estimateStreamConsumerCost({ recordsPerMonth: 10_000_000, batchSize: 100 });
 */
export function estimateStreamConsumerCost(
  input: StreamConsumerCostEstimateInput,
): StreamConsumerCostEstimate {
  const batchSize = input.batchSize ?? 100;
  const estimatedInvocations = Math.ceil(input.recordsPerMonth / batchSize);
  const requestUsd =
    (estimatedInvocations / 1_000_000) *
    (input.lambdaRequestUsdPerMillion ?? 0.2);
  return { estimatedInvocations, requestUsd };
}

/**
 * List stream descriptors, optionally scoped to one DynamoDB table.
 *
 * @example
 * const streams = await listTableStreams("orders");
 */
export async function listTableStreams(
  tableName?: string,
  streams: DynamoDBStreamsClient = defaultClient,
): Promise<Stream[]> {
  try {
    return (
      (await streams.send(new ListStreamsCommand({ TableName: tableName })))
        .Streams ?? []
    );
  } catch (error) {
    wrapError("listTableStreams", error);
  }
}

/**
 * Return most recent stream ARN for a table.
 *
 * @example
 * const streamArn = await latestStreamArn("orders");
 */
export async function latestStreamArn(
  tableName: string,
  streams: DynamoDBStreamsClient = defaultClient,
): Promise<string | undefined> {
  const xs = await listTableStreams(tableName, streams);
  return xs[0]?.StreamArn;
}

/**
 * Describe stream metadata, key schema, shards, and view type.
 *
 * @example
 * const description = await describeStream(streamArn);
 */
export async function describeStream(
  streamArn: string,
  streams: DynamoDBStreamsClient = defaultClient,
): Promise<StreamDescription | undefined> {
  try {
    return (
      await streams.send(new DescribeStreamCommand({ StreamArn: streamArn }))
    ).StreamDescription;
  } catch (error) {
    wrapError("describeStream", error);
  }
}

/**
 * List shard IDs for a stream.
 *
 * @example
 * const shards = await shardIds(streamArn);
 */
export async function shardIds(
  streamArn: string,
  streams: DynamoDBStreamsClient = defaultClient,
): Promise<string[]> {
  const description = await describeStream(streamArn, streams);
  return (
    description?.Shards?.map((shard) => shard.ShardId).filter(
      (id): id is string => Boolean(id),
    ) ?? []
  );
}

/**
 * Create a shard iterator from trim horizon or latest record.
 *
 * @example
 * const iterator = await getShardIterator(streamArn, shardId, "TRIM_HORIZON");
 */
export async function getShardIterator(
  streamArn: string,
  shardId: string,
  iteratorType: "TRIM_HORIZON" | "LATEST" = "TRIM_HORIZON",
  streams: DynamoDBStreamsClient = defaultClient,
): Promise<string | undefined> {
  try {
    return (
      await streams.send(
        new GetShardIteratorCommand({
          StreamArn: streamArn,
          ShardId: shardId,
          ShardIteratorType: iteratorType,
        }),
      )
    ).ShardIterator;
  } catch (error) {
    wrapError("getShardIterator", error);
  }
}

/**
 * Read one batch from one shard.
 *
 * @example
 * const result = await readShardRecords(streamArn, shardId, 100);
 */
export async function readShardRecords(
  streamArn: string,
  shardId: string,
  limit = 100,
  streams: DynamoDBStreamsClient = defaultClient,
): Promise<ShardReadResult> {
  const iterator = await getShardIterator(
    streamArn,
    shardId,
    "TRIM_HORIZON",
    streams,
  );
  if (!iterator) return { shardId, records: [] };

  try {
    const result = await streams.send(
      new GetRecordsCommand({ ShardIterator: iterator, Limit: limit }),
    );
    return {
      shardId,
      records: result.Records ?? [],
      ...(result.NextShardIterator && {
        nextShardIterator: result.NextShardIterator,
      }),
    };
  } catch (error) {
    wrapError("readShardRecords", error);
  }
}

/**
 * Read one batch from every shard in a stream.
 *
 * @example
 * const records = await readRecords(streamArn, 100);
 */
export async function readRecords(
  streamArn: string,
  limit = 100,
  streams: DynamoDBStreamsClient = defaultClient,
): Promise<StreamRecord[]> {
  try {
    const ids = await shardIds(streamArn, streams);
    const out: StreamRecord[] = [];
    for (const shardId of ids) {
      const result = await readShardRecords(streamArn, shardId, limit, streams);
      out.push(...result.records);
    }
    return out;
  } catch (error) {
    wrapError("readRecords", error);
  }
}

/**
 * Convert a raw DynamoDB stream record into handler-friendly summary.
 *
 * @example
 * const summary = summarizeRecord(record);
 */
export function summarizeRecord(record: StreamRecord): StreamRecordSummary {
  return {
    eventName: record.eventName,
    keys: record.dynamodb?.Keys,
    newImage: record.dynamodb?.NewImage,
    oldImage: record.dynamodb?.OldImage,
    sequenceNumber: record.dynamodb?.SequenceNumber,
    approximateCreationDateTime: record.dynamodb?.ApproximateCreationDateTime,
  };
}

/**
 * Summarize multiple records for logging, tests, or Lambda handler inputs.
 *
 * @example
 * const summaries = summarizeRecords(records);
 */
export function summarizeRecords(
  records: StreamRecord[],
): StreamRecordSummary[] {
  return records.map(summarizeRecord);
}

/**
 * Filter records by operation type before routing to handlers.
 *
 * @example
 * const inserts = filterRecordsByEventName(records, "INSERT");
 */
export function filterRecordsByEventName(
  records: StreamRecord[],
  eventName: OperationType,
): StreamRecord[] {
  return records.filter((record) => record.eventName === eventName);
}

/**
 * Process records one by one. Handler returns false to skip without failure.
 *
 * @example
 * await processStreamRecords(records, async (record) => project(record));
 */
export async function processStreamRecords(
  records: StreamRecord[],
  handler: (
    record: StreamRecord,
    summary: StreamRecordSummary,
  ) => Promise<boolean | void>,
): Promise<StreamProcessorResult> {
  const result: StreamProcessorResult = {
    received: records.length,
    processed: 0,
    skipped: 0,
    failed: 0,
  };
  for (const record of records) {
    try {
      const handled = await handler(record, summarizeRecord(record));
      if (handled === false) result.skipped += 1;
      else result.processed += 1;
    } catch {
      result.failed += 1;
    }
  }
  return result;
}

/**
 * Calculate stream record age snapshot for observability alarms.
 *
 * @example
 * const lag = streamLagSnapshot(records, 60_000);
 */
export function streamLagSnapshot(
  records: StreamRecord[],
  maxAgeMs = 60_000,
  now = new Date(),
): StreamLagSnapshot {
  const ages = records.flatMap((record) => {
    const at = record.dynamodb?.ApproximateCreationDateTime;
    return at ? [Math.max(0, now.getTime() - at.getTime())] : [];
  });
  const oldestRecordAgeMs = ages.length ? Math.max(...ages) : 0;
  const newestRecordAgeMs = ages.length ? Math.min(...ages) : 0;
  return {
    recordCount: records.length,
    oldestRecordAgeMs,
    newestRecordAgeMs,
    alarmHints: oldestRecordAgeMs > maxAgeMs ? ["IteratorAgeHigh"] : [],
  };
}
