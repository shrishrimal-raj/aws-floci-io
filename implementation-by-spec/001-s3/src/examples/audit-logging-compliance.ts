#!/usr/bin/env tsx
import { createBucket, deleteBucket, getJsonObject, putJsonObject, writeAuditLogEntry, type AuditLogEntry } from "../use-cases/object-storage.js";

const dataBucket = `floci-s3-compliance-data-${Date.now()}`;
const auditBucket = `floci-s3-compliance-audit-${Date.now()}`;

await createBucket(dataBucket);
await createBucket(auditBucket);

const documentKey = "tenants/acme-bank/users/user-123/contracts/msa.json";
await putJsonObject({
  bucket: dataBucket,
  key: documentKey,
  value: { contractId: "msa-001", status: "approved" },
  metadata: { tenantId: "acme-bank", classification: "confidential" },
});

const auditEntry: AuditLogEntry = {
  eventId: `evt-${Date.now()}`,
  timestamp: new Date().toISOString(),
  tenantId: "acme-bank",
  actorId: "user-123",
  action: "ContractDownloaded",
  bucket: dataBucket,
  key: documentKey,
  outcome: "ALLOW",
  requestId: "req-789",
};

await writeAuditLogEntry(auditBucket, auditEntry);

console.log({
  document: await getJsonObject(dataBucket, documentKey),
  auditEvent: auditEntry,
  control: "every sensitive object access creates tenant/date-partitioned audit JSON",
});

await deleteBucket(dataBucket);
await deleteBucket(auditBucket);
