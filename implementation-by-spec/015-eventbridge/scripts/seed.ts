#!/usr/bin/env tsx
import { busName } from "./setup.js";
import { publishEvent } from "../src/use-cases/events.js";
await publishEvent(busName,"floci.lab","lab.created",{id:"seed-1"});
console.log(`Seed EventBridge bus ${busName}`);
