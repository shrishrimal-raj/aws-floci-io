#!/usr/bin/env tsx
import { createCoreClients } from "../../../src/core-clients.js";

const endpoint = process.env.AWS_ENDPOINT_URL ?? "http://localhost:4566";
const clients = createCoreClients({ endpoint });

console.log("TaskFlow API Phase 01 client wiring");
console.log("service          | client");
console.log("-----------------|-----------------------");
for (const [name, client] of Object.entries(clients)) {
  console.log(`${name.padEnd(16)} | ${client.constructor.name}`);
}
console.log(`endpoint         | ${endpoint}`);
console.log("Next: run implementation-by-spec setup scripts, then wire resources for full e2e.");
