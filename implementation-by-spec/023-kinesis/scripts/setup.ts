#!/usr/bin/env tsx
import { createStream } from "../src/use-cases/streams.js";
export const streamName = process.env.KINESIS_STREAM_NAME ?? "floci-kinesis-lab";
await createStream(streamName,1);
console.log(`Setup Kinesis stream ${streamName}`);
