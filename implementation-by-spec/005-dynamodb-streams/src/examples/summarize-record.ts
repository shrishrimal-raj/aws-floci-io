#!/usr/bin/env tsx
import { summarizeRecord } from "../use-cases/streams.js";

const summary = summarizeRecord({
  eventName: "INSERT",
  dynamodb: {
    Keys: { pk: { S: "USER#1" }, sk: { S: "PROFILE" } },
    NewImage: { pk: { S: "USER#1" }, sk: { S: "PROFILE" }, name: { S: "Ada" } },
    SequenceNumber: "1",
  },
});

console.log(summary);
