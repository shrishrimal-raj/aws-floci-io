#!/usr/bin/env tsx
import { createStream, deleteStream, putJsonRecord } from "../use-cases/streams.js";
const stream = `floci-kinesis-${Date.now()}`;
await createStream(stream);
console.log(await putJsonRecord(stream,"pk",{ok:true}));
await deleteStream(stream);
