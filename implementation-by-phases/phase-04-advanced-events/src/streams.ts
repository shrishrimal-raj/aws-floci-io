import { GetRecordsCommand, GetShardIteratorCommand, type DynamoDBStreamsClient } from "@aws-sdk/client-dynamodb-streams";
import { PutRecordCommand, type KinesisClient } from "@aws-sdk/client-kinesis";
import { PutRecordCommand as PutFirehoseRecordCommand, type FirehoseClient } from "@aws-sdk/client-firehose";

export interface ClickEvent {
  tenantId: string;
  sessionId: string;
  userId?: string;
  path: string;
  at: string;
}

export function partitionKeyForClick(event: ClickEvent): string {
  return `${event.tenantId}#${event.sessionId}`;
}

export function detectHotPartition(keys: string[], thresholdRatio = 0.5): string | undefined {
  const counts = new Map<string, number>();
  for (const key of keys) counts.set(key, (counts.get(key) ?? 0) + 1);
  for (const [key, count] of counts) if (count / keys.length > thresholdRatio) return key;
  return undefined;
}

export class ClickStream {
  constructor(private readonly kinesis: KinesisClient, private readonly streamName = process.env.CLICK_STREAM_NAME ?? "commerce-clicks") {}

  async put(event: ClickEvent): Promise<void> {
    await this.kinesis.send(
      new PutRecordCommand({ StreamName: this.streamName, PartitionKey: partitionKeyForClick(event), Data: Buffer.from(JSON.stringify(event)) })
    );
  }
}

export class FirehoseSink {
  constructor(private readonly firehose: FirehoseClient, private readonly streamName = process.env.FIREHOSE_STREAM_NAME ?? "commerce-events-to-s3") {}

  async put(record: unknown): Promise<void> {
    await this.firehose.send(
      new PutFirehoseRecordCommand({ DeliveryStreamName: this.streamName, Record: { Data: Buffer.from(`${JSON.stringify(record)}\n`) } })
    );
  }
}

export interface StreamChange {
  eventName?: string;
  keys?: Record<string, unknown>;
  newImage?: Record<string, unknown>;
  oldImage?: Record<string, unknown>;
}

export function mapDynamoStreamRecord(record: { eventName?: string; dynamodb?: { Keys?: unknown; NewImage?: unknown; OldImage?: unknown } }): StreamChange {
  return {
    eventName: record.eventName,
    keys: record.dynamodb?.Keys as Record<string, unknown> | undefined,
    newImage: record.dynamodb?.NewImage as Record<string, unknown> | undefined,
    oldImage: record.dynamodb?.OldImage as Record<string, unknown> | undefined,
  };
}

export class DynamoStreamReader {
  constructor(private readonly streams: DynamoDBStreamsClient) {}

  async readOnce(streamArn: string, shardId: string): Promise<StreamChange[]> {
    const iterator = await this.streams.send(new GetShardIteratorCommand({ StreamArn: streamArn, ShardId: shardId, ShardIteratorType: "TRIM_HORIZON" }));
    if (!iterator.ShardIterator) return [];
    const records = await this.streams.send(new GetRecordsCommand({ ShardIterator: iterator.ShardIterator, Limit: 100 }));
    return (records.Records ?? []).map(mapDynamoStreamRecord);
  }
}
