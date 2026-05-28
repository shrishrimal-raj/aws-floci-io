#!/usr/bin/env tsx
import { createPipe } from "../src/use-cases/pipes.js";
export const pipeName = process.env.PIPE_NAME ?? "floci-pipe-lab";
await createPipe({name:pipeName,sourceArn:"arn:aws:sqs:us-east-1:000000000000:source",targetArn:"arn:aws:events:us-east-1:000000000000:event-bus/default",roleArn:"arn:aws:iam::000000000000:role/pipes"});
console.log(`Setup EventBridge Pipe ${pipeName}`);
