#!/usr/bin/env tsx
import { clickstreamAnalyticsExample, estimateKinesisShards, sampleClickEvents } from "../../../src/index.js";

const launchTraffic = {
  recordsPerSecond: 12_000,
  avgRecordBytes: 850,
  recommendedShards: estimateKinesisShards(12_000, 850),
};

console.log("Streaming analytics capacity plan");
console.log(JSON.stringify(clickstreamAnalyticsExample(sampleClickEvents()), null, 2));
console.log(JSON.stringify(launchTraffic, null, 2));
