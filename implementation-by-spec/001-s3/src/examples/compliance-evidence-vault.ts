#!/usr/bin/env tsx
import {
  createBucket,
  createPresignedGetUrl,
  deleteBucket,
  enableVersioning,
  estimateMonthlyStorageCost,
  getJsonObject,
  getVersioningStatus,
  listObjects,
  parseS3Uri,
  putJsonObject,
  putLifecycleExpirationRule,
  s3Uri,
  writeAuditLogEntry,
  writeBackupManifest,
} from "../use-cases/object-storage.js";

/**
 * Compliance Evidence Vault
 *
 * Real-world pattern: security/GRC teams store SOC 2, ISO 27001, HIPAA, or SOX
 * evidence in private S3 prefixes. Every read is audited, evidence has retention,
 * versioning protects against overwrites, and backup manifests support DR drills.
 */

interface EvidenceDocument {
  controlId: string;
  system: string;
  period: string;
  classification: "internal" | "confidential" | "restricted";
  evidence: Record<string, unknown>;
}

const evidenceBucket = `floci-s3-evidence-${Date.now()}`;
const auditBucket = `floci-s3-evidence-audit-${Date.now()}`;
const tenantId = "acme-health";
const auditorId = "auditor@example.com";

function evidenceKey(controlId: string, fileName: string): string {
  return `tenants/${tenantId}/evidence/framework=soc2/control=${controlId}/${fileName}`;
}

await createBucket(evidenceBucket);
await createBucket(auditBucket);

// Function focus: versioning. Compliance evidence should preserve overwrite history.
await enableVersioning(evidenceBucket);

// Function focus: lifecycle. Keep evidence long enough for audit/regulatory windows.
await putLifecycleExpirationRule({
  bucket: evidenceBucket,
  id: "retain-soc2-evidence-seven-years",
  prefix: `tenants/${tenantId}/evidence/framework=soc2/`,
  days: 365 * 7,
});

const key = evidenceKey("CC6.1", "access-review-q1.json");
const document: EvidenceDocument = {
  controlId: "CC6.1",
  system: "identity-platform",
  period: "2026-Q1",
  classification: "restricted",
  evidence: {
    reviewer: "security-manager@example.com",
    populationCount: 184,
    exceptions: 0,
    signedAt: new Date().toISOString(),
  },
};

// Function focus: typed JSON storage with metadata for search, policy, and audit.
await putJsonObject({
  bucket: evidenceBucket,
  key,
  value: document,
  metadata: {
    tenantId,
    framework: "soc2",
    controlId: document.controlId,
    classification: document.classification,
  },
});

const objectUri = s3Uri(evidenceBucket, key);
const parsed = parseS3Uri(objectUri);
const evidence = await getJsonObject<EvidenceDocument>(parsed.bucket, parsed.key);

// Function focus: short-lived access. App authorizes auditor first, then returns URL.
const auditorDownloadUrl = await createPresignedGetUrl(evidenceBucket, key, 300);

// Function focus: immutable-style audit trail per tenant/date.
await writeAuditLogEntry(auditBucket, {
  eventId: `evt-${Date.now()}-evidence-read`,
  timestamp: new Date().toISOString(),
  tenantId,
  actorId: auditorId,
  action: "EvidenceDownloaded",
  bucket: evidenceBucket,
  key,
  outcome: "ALLOW",
  requestId: "req-evidence-review-001",
});

// Function focus: DR evidence. Manifest lists what must be restored after incident.
const manifest = await writeBackupManifest(
  evidenceBucket,
  `tenants/${tenantId}/evidence/`,
);

const cost = estimateMonthlyStorageCost({
  storageGb: 25,
  putRequests: 12_000,
  getRequests: 50_000,
});

console.log({
  useCase: "compliance evidence vault with retention, audit, and DR controls",
  versioning: await getVersioningStatus(evidenceBucket),
  evidenceUri: objectUri,
  evidenceControl: evidence.controlId,
  auditorUrlHasSignature: auditorDownloadUrl.includes("X-Amz-Signature"),
  auditObjects: await listObjects(auditBucket, `audit/tenant=${tenantId}/`),
  backupManifest: {
    objectCount: manifest.objectCount,
    totalBytes: manifest.totalBytes,
  },
  monthlyCostEstimateUsd: cost.totalUsd,
  productionMapping: [
    "CloudTrail data events for independent access evidence",
    "S3 Object Lock or legal hold for immutable regulated archives",
    "KMS CMK with rotation and least-privilege decrypt grants",
    "AWS Backup or CRR for cross-region restore objectives",
  ],
});

await deleteBucket(evidenceBucket);
await deleteBucket(auditBucket);
