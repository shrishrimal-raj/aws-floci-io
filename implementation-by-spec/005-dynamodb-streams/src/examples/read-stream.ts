#!/usr/bin/env tsx
import { latestStreamArn, readRecords } from "../use-cases/streams.js";
const table = process.env.DDB_STREAMS_TABLE ?? "floci-ddb-streams-lab";
const streamArn = await latestStreamArn(table);
console.log(streamArn ? await readRecords(streamArn) : []);
