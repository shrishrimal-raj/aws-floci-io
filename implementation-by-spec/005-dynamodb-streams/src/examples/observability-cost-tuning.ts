#!/usr/bin/env tsx
import {
  estimateStreamConsumerCost,
  streamLagSnapshot,
  summarizeRecords,
} from "../use-cases/streams.js";

const records = [
  {
    eventName: "INSERT" as const,
    dynamodb: {
      Keys: { pk: { S: "TENANT#acme#ORDER#1" }, sk: { S: "PROFILE" } },
      SequenceNumber: "5001",
      ApproximateCreationDateTime: new Date(Date.now() - 90_000),
    },
  },
];

console.log({
  summaries: summarizeRecords(records),
  lag: streamLagSnapshot(records, 60_000),
  monthlyConsumerCostEstimate: estimateStreamConsumerCost({
    recordsPerMonth: 10_000_000,
    batchSize: 100,
  }),
  monitoring: [
    "IteratorAge",
    "Errors",
    "Throttles",
    "ConcurrentExecutions",
    "DLQ depth",
    "partial batch failures",
  ],
  costOptimization:
    "increase batch size carefully, filter records early, keep handler fast, avoid unnecessary downstream writes",
});
