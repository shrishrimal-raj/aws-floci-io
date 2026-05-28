#!/usr/bin/env tsx
import { deletePipe } from "../src/use-cases/pipes.js";
const pipeName = process.env.PIPE_NAME ?? "floci-pipe-lab";
await deletePipe(pipeName);
console.log(`Cleanup EventBridge Pipe ${pipeName}`);
