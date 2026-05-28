#!/usr/bin/env tsx
import { createPipe, deletePipe } from "../use-cases/pipes.js";
const name = `floci-pipe-${Date.now()}`;
await createPipe({name,sourceArn:"arn:aws:sqs:us-east-1:000000000000:q",targetArn:"arn:aws:events:us-east-1:000000000000:event-bus/default",roleArn:"arn:aws:iam::000000000000:role/r"});
await deletePipe(name);
