#!/usr/bin/env tsx
import { deleteDeliveryStream } from "../src/use-cases/delivery-streams.js";
const streamName = process.env.FIREHOSE_STREAM ?? "floci-firehose-lab";
await deleteDeliveryStream(streamName);
console.log(`Cleanup Firehose ${streamName}`);
