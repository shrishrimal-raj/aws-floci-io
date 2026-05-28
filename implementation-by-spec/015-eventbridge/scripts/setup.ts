#!/usr/bin/env tsx
import { createBus, putRule } from "../src/use-cases/events.js";
export const busName = process.env.EVENT_BUS_NAME ?? "floci-eventbridge-lab";
await createBus(busName);
await putRule("floci-lab-rule",busName,"floci.lab","lab.created");
console.log(`Setup EventBridge bus ${busName}`);
