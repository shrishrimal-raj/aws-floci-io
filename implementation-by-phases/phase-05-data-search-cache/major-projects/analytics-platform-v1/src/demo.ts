#!/usr/bin/env tsx
import { createDataClients, createEventsTableInput, lakePrefix, productIndexMapping, productSchemaSql } from "../../../src/index.js";

const clients = createDataClients();
console.log("Analytics Platform v1 demo");
console.log("clients:", Object.fromEntries(Object.entries(clients).map(([name, client]) => [name, client.constructor.name])));
console.log("postgres schema lines:", productSchemaSql().trim().split("\n").length);
console.log("opensearch mapping keys:", Object.keys(productIndexMapping()));
console.log("sample lake prefix:", lakePrefix("silver", "checkout", { tenantId: "tenant-a", year: "2026", month: "05", day: "28" }));
console.log("glue table:", createEventsTableInput("analytics", "events", "s3://analytics/silver/").TableInput?.Name);
