#!/usr/bin/env tsx
import {
  getShardIterator,
  latestStreamArn,
  readRecords,
  readShardRecords,
  shardIds,
} from "../use-cases/streams.js";

const table = process.env.DDB_STREAMS_TABLE ?? "floci-ddb-streams-lab";
const streamArn = await latestStreamArn(table);

if (!streamArn) {
  console.log([]);
} else {
  const [firstShardId] = await shardIds(streamArn);
  const iterator = firstShardId
    ? await getShardIterator(streamArn, firstShardId, "TRIM_HORIZON")
    : undefined;
  const firstShard = firstShardId
    ? await readShardRecords(streamArn, firstShardId, 25)
    : undefined;
  const allRecords = await readRecords(streamArn, 100);
  console.log({ iteratorAvailable: Boolean(iterator), firstShard, allRecords });
}
