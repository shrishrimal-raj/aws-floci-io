#!/usr/bin/env tsx
import {
  describeStream,
  latestStreamArn,
  listTableStreams,
  shardIds,
} from "../use-cases/streams.js";

const table = process.env.DDB_STREAMS_TABLE ?? "floci-ddb-streams-lab";
const streams = await listTableStreams(table);
const streamArn = await latestStreamArn(table);
const description = streamArn ? await describeStream(streamArn) : undefined;

console.log({
  streams,
  streamArn,
  status: description?.StreamStatus,
  viewType: description?.StreamViewType,
  shards: streamArn ? await shardIds(streamArn) : [],
});
