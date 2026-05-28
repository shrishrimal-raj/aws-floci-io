#!/usr/bin/env tsx
import { deleteStream } from "../src/use-cases/streams.js";
const streamName = process.env.KINESIS_STREAM_NAME ?? "floci-kinesis-lab";
await deleteStream(streamName);
console.log(`Cleanup Kinesis stream ${streamName}`);
