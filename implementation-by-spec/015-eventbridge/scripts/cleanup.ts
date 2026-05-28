#!/usr/bin/env tsx
import { deleteBus, deleteRuleWithTargets } from "../src/use-cases/events.js";
const busName = process.env.EVENT_BUS_NAME ?? "floci-eventbridge-lab";
await deleteRuleWithTargets("floci-lab-rule",busName);
await deleteBus(busName);
console.log(`Cleanup EventBridge bus ${busName}`);
