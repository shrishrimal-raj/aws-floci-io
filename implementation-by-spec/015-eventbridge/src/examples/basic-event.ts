#!/usr/bin/env tsx
import { createBus, deleteBus, publishEvent } from "../use-cases/events.js";
const bus = `floci-bus-${Date.now()}`;
await createBus(bus);
console.log(await publishEvent(bus,"app","created",{id:"1"}));
await deleteBus(bus);
