#!/usr/bin/env tsx
import { secretAuditEvent, secretVersion } from "../use-cases/secrets.js";

/**
 * Enterprise pattern: model EventBridge/SNS notification consumed by apps to refresh cached secret version.
 */
const event = {
  source: "aws.secretsmanager",
  detailType: "Secret Rotation Succeeded",
  detail: { secretId: "prod/payments/db", versionId: "v2" },
};

const cached = secretVersion(event.detail.secretId, { status: "refresh-required" }, event.detail.versionId);

console.log({
  cacheAction: "invalidate-and-refetch",
  cached,
  audit: secretAuditEvent({ secretId: event.detail.secretId, actor: "cache-refresh-worker", action: "read", outcome: "success", details: { versionId: event.detail.versionId } }),
});
