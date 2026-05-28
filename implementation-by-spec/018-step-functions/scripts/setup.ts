#!/usr/bin/env tsx
import { createStateMachine } from "../src/use-cases/workflows.js";
export const machineName = process.env.SFN_NAME ?? "floci-sfn-lab";
const arn = await createStateMachine(machineName);
console.log(`Setup Step Functions state machine ${arn}`);
