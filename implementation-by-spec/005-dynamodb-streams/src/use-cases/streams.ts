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

function awsErrorName(error: unknown): string {
  if (error instanceof DynamoDBStreamsError && error.cause instanceof Error) return error.cause.name;
  return error instanceof Error ? error.name : "";
}

function wrapError(operation: string, error: unknown): never {
  const code = awsErrorName(error) || "UNKNOWN";
  throw new DynamoDBStreamsError(code, `DynamoDB Streams ${operation} failed`, error);
}

/**
 * List stream descriptors, optionally scoped to one DynamoDB table.
 *
 * @example
 * const streams = await listTableStreams("orders");
 */
export async function listTableStreams(
  tableName?: string,
  streams: DynamoDBStreamsClient = defaultClient
): Promise<Stream[]> {
  try {
    return (await streams.send(new ListStreamsCommand({ TableName: tableName }))).Streams ?? [];
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
  streams: DynamoDBStreamsClient = defaultClient
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
  streams: DynamoDBStreamsClient = defaultClient
): Promise<StreamDescription | undefined> {
  try {
    return (await streams.send(new DescribeStreamCommand({ StreamArn: streamArn }))).StreamDescription;
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
export async function shardIds(streamArn: string, streams: DynamoDBStreamsClient = defaultClient): Promise<string[]> {
  const description = await describeStream(streamArn, streams);
  return description?.Shards?.map((shard) => shard.ShardId).filter((id): id is string => Boolean(id)) ?? [];
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
  streams: DynamoDBStreamsClient = defaultClient
): Promise<string | undefined> {
  try {
    return (
      await streams.send(
        new GetShardIteratorCommand({ StreamArn: streamArn, ShardId: shardId, ShardIteratorType: iteratorType })
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
  streams: DynamoDBStreamsClient = defaultClient
): Promise<ShardReadResult> {
  const iterator = await getShardIterator(streamArn, shardId, "TRIM_HORIZON", streams);
  if (!iterator) return { shardId, records: [] };

  try {
    const result = await streams.send(new GetRecordsCommand({ ShardIterator: iterator, Limit: limit }));
    return {
      shardId,
      records: result.Records ?? [],
      ...(result.NextShardIterator && { nextShardIterator: result.NextShardIterator }),
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
  streams: DynamoDBStreamsClient = defaultClient
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
export function summarizeRecords(records: StreamRecord[]): StreamRecordSummary[] {
  return records.map(summarizeRecord);
}
