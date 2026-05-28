import {
  DescribeStreamCommand,
  DynamoDBStreamsClient,
  GetRecordsCommand,
  GetShardIteratorCommand,
  ListStreamsCommand,
  type _Record as StreamRecord,
} from "@aws-sdk/client-dynamodb-streams";
import { client as defaultClient } from "../client.js";
import { DynamoDBStreamsError } from "../errors.js";

const err = (op: string, e: unknown): never => {
  throw new DynamoDBStreamsError(
    e instanceof Error && e.name ? e.name : "UNKNOWN",
    `DynamoDB Streams ${op} failed`,
    e
  );
};

export async function listTableStreams(tableName?: string, streams: DynamoDBStreamsClient = defaultClient) {
  try {
    return (await streams.send(new ListStreamsCommand({ TableName: tableName }))).Streams ?? [];
  } catch (e) {
    return err("listTableStreams", e);
  }
}

export async function latestStreamArn(tableName: string, streams: DynamoDBStreamsClient = defaultClient) {
  const xs = await listTableStreams(tableName, streams);
  return xs[0]?.StreamArn;
}

export async function describeStream(streamArn: string, streams: DynamoDBStreamsClient = defaultClient) {
  try {
    return (await streams.send(new DescribeStreamCommand({ StreamArn: streamArn }))).StreamDescription;
  } catch (e) {
    return err("describeStream", e);
  }
}

export async function shardIds(streamArn: string, streams: DynamoDBStreamsClient = defaultClient) {
  const d = await describeStream(streamArn, streams);
  return d?.Shards?.map((s) => s.ShardId).filter((x): x is string => Boolean(x)) ?? [];
}

export async function getShardIterator(
  streamArn: string,
  shardId: string,
  iteratorType: "TRIM_HORIZON" | "LATEST" = "TRIM_HORIZON",
  streams: DynamoDBStreamsClient = defaultClient
) {
  try {
    return (
      await streams.send(
        new GetShardIteratorCommand({ StreamArn: streamArn, ShardId: shardId, ShardIteratorType: iteratorType })
      )
    ).ShardIterator;
  } catch (e) {
    return err("getShardIterator", e);
  }
}

export async function readRecords(
  streamArn: string,
  limit = 100,
  streams: DynamoDBStreamsClient = defaultClient
): Promise<StreamRecord[]> {
  try {
    const ids = await shardIds(streamArn, streams);
    const out: StreamRecord[] = [];
    for (const shardId of ids) {
      const it = await getShardIterator(streamArn, shardId, "TRIM_HORIZON", streams);
      if (!it) continue;
      const res = await streams.send(new GetRecordsCommand({ ShardIterator: it, Limit: limit }));
      out.push(...(res.Records ?? []));
    }
    return out;
  } catch (e) {
    return err("readRecords", e);
  }
}

export function summarizeRecord(record: StreamRecord) {
  return {
    eventName: record.eventName,
    keys: record.dynamodb?.Keys,
    newImage: record.dynamodb?.NewImage,
    oldImage: record.dynamodb?.OldImage,
    sequenceNumber: record.dynamodb?.SequenceNumber,
  };
}
