#!/usr/bin/env tsx
import {
  assumeRoleSession,
  buildScopedSessionPolicy,
  createExternalId,
  createStsAuditEvent,
  createStsRetryPlan,
  planCredentialRefresh,
} from "../use-cases/credentials.js";

const tenantId = "acme-retail";
const exportRoleArn = "arn:aws:iam::111122223333:role/tenant-export-worker";
const tenantPrefix = `arn:aws:s3:::acme-tenant-exports/${tenantId}/*`;

const sessionPolicy = buildScopedSessionPolicy([
  { effect: "Allow", actions: ["s3:PutObject", "s3:GetObject"], resources: [tenantPrefix] },
  { effect: "Allow", actions: ["kms:Encrypt", "kms:Decrypt"], resources: ["arn:aws:kms:us-east-1:111122223333:key/tenant-export-key"] },
]);

const session = await assumeRoleSession(exportRoleArn, `${tenantId}-export`, 3600, undefined, {
  externalId: createExternalId(tenantId, "data-export"),
  sourceIdentity: "export-worker",
  sessionPolicy,
});

console.log({
  useCase: "Tenant-scoped data lifecycle export",
  tenantId,
  allowedPrefix: tenantPrefix,
  refreshPlan: planCredentialRefresh(session.credentials, { requiredWorkloadTtlMs: 1_800_000 }),
  retry: createStsRetryPlan("standard"),
  audit: createStsAuditEvent({
    operation: "AssumeRole",
    actor: "export-worker",
    targetArn: exportRoleArn,
    sessionName: `${tenantId}-export`,
    outcome: "ALLOW",
    traceId: "trace-export-2026-05-30",
    reason: "Tenant export uses scoped S3/KMS session policy and short-lived credentials",
  }),
});
