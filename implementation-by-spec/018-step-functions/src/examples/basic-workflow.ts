#!/usr/bin/env tsx
import { createStateMachine, deleteStateMachine, startExecution } from "../use-cases/workflows.js";
const arn = await createStateMachine(`floci-sfn-${Date.now()}`);
console.log(await startExecution(arn,{ok:true}));
await deleteStateMachine(arn);
