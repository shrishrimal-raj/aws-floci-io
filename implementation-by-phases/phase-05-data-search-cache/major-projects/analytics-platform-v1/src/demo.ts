#!/usr/bin/env tsx
import {
  buildPartitionedDashboardSql,
  complianceTags,
  createDataClients,
  createEventsTableInput,
  dataLifecycleRule,
  lakePrefix,
  productIndexMapping,
  productSchemaSql,
} from "../../../src/index.js";
import { provisionRegulatedTenantDataControls } from "./compliance-data-lake.js";
import { loadExecutiveCheckoutDashboard } from "./cost-optimized-dashboard.js";

const clients = createDataClients();
console.log("Analytics Platform v1 demo");
console.log("clients:", Object.fromEntries(Object.entries(clients).map(([name, client]) => [name, client.constructor.name])));
console.log("postgres schema lines:", productSchemaSql().trim().split("\n").length);
console.log("opensearch mapping keys:", Object.keys(productIndexMapping()));
console.log("sample lake prefix:", lakePrefix("silver", "checkout", { tenantId: "tenant-a", year: "2026", month: "05", day: "28" }));
console.log("glue table:", createEventsTableInput("analytics", "events", "s3://analytics/silver/").TableInput?.Name);
console.log("partitioned dashboard sql:", buildPartitionedDashboardSql({ tableName: "events", tenantId: "tenant-a", eventType: "checkout", partition: { tenantId: "tenant-a", year: "2026", month: "05", day: "28" } }).replace(/\n/g, " "));
console.log("lifecycle:", dataLifecycleRule("bronze/", 400));
console.log("compliance tags:", complianceTags({ owner: "data-platform", dataClassification: "restricted", retentionDays: 400, costCenter: "FIN-001" }));
console.log("dashboard result:", await loadExecutiveCheckoutDashboard());
console.log("regulated controls:", await provisionRegulatedTenantDataControls());
