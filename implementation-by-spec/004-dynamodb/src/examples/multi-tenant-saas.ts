#!/usr/bin/env tsx
import {
  createSingleTable,
  deleteTable,
  entityKeys,
  getJsonEntity,
  putJsonEntityIfAbsent,
  queryGsi,
  statusIndexKeys,
  updateJsonPatchWithRetry,
} from "../use-cases/table.js";

interface CustomerAccount extends Record<string, string | number | boolean> {
  tenantId: string;
  accountId: string;
  email: string;
  plan: string;
  status: string;
}

const table = `floci-ddb-saas-${Date.now()}`;
await createSingleTable(table);

const keys = entityKeys({
  tenantId: "acme-saas",
  entityType: "ACCOUNT",
  entityId: "acct-1001",
});
const statusKeys = statusIndexKeys(
  "acme-saas",
  "ACCOUNT",
  "ACTIVE",
  new Date().toISOString(),
);

await putJsonEntityIfAbsent<CustomerAccount>(
  {
    ...keys,
    entityType: "CustomerAccount",
    value: {
      tenantId: "acme-saas",
      accountId: "acct-1001",
      email: "owner@acme.example",
      plan: "enterprise",
      status: "ACTIVE",
    },
    ...statusKeys,
  },
  table,
);

await updateJsonPatchWithRetry(
  keys.pk,
  keys.sk,
  { plan: "enterprise-plus" },
  { attempts: 3, baseDelayMs: 50 },
  table,
);

console.log({
  secureAccessPattern:
    "all keys include tenant id; API must derive tenant from auth claims, not request body",
  account: await getJsonEntity<CustomerAccount>(keys.pk, keys.sk, table),
  activeAccounts: await queryGsi(statusKeys.gsi1pk, table),
});

await deleteTable(table);
