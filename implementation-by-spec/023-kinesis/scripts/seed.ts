#!/usr/bin/env tsx
import { streamName } from "./setup.js";
import { putJsonRecord } from "../src/use-cases/streams.js";
await putJsonRecord(streamName,"pk-1",{event:"seed"});
console.log(`Seed Kinesis stream ${streamName}`);
