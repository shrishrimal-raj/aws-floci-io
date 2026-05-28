#!/usr/bin/env tsx
import { streamName } from "./setup.js";
import { putJsonRecord } from "../src/use-cases/delivery-streams.js";
await putJsonRecord(streamName,{event:"seed"});
console.log(`Seed Firehose ${streamName}`);
