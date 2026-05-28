#!/usr/bin/env tsx
import { createS3DeliveryStream } from "../src/use-cases/delivery-streams.js";
export const streamName = process.env.FIREHOSE_STREAM ?? "floci-firehose-lab";
await createS3DeliveryStream(streamName);
console.log(`Setup Firehose ${streamName}`);
