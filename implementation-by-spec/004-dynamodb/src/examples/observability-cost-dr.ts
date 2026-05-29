#!/usr/bin/env tsx
import {
  createSingleTable,
  deleteTable,
  describeTable,
  estimateDynamoDbCost,
  putItem,
  scanAll,
} from "../use-cases/table.js";

const table = `floci-ddb-ops-${Date.now()}`;
await createSingleTable(table);

await putItem(
  {
    pk: { S: "TENANT#acme#METRIC#orders" },
    sk: { S: new Date().toISOString() },
    count: { N: "42" },
    service: { S: "checkout" },
  },
  table,
);

const description = await describeTable(table);
const estimate = estimateDynamoDbCost({
  readRequestUnits: 5_000_000,
  writeRequestUnits: 1_000_000,
  storageGb: 10,
});

console.log({
  tableStatus: description?.TableStatus,
  streamArn: description?.LatestStreamArn,
  adminScanPreview: await scanAll(table),
  monthlyCostEstimate: estimate,
  disasterRecovery:
    "enable PITR, on-demand backups, IaC table recreation, and tested restore runbooks in real AWS",
  monitoring: [
    "ConsumedReadCapacityUnits",
    "ConsumedWriteCapacityUnits",
    "ThrottledRequests",
    "SystemErrors",
    "SuccessfulRequestLatency",
  ],
});

await deleteTable(table);
