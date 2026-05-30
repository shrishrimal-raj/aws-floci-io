#!/usr/bin/env tsx
import { pathToFileURL } from "node:url";
import { applicationKeyPolicy, estimateKmsMonthlyRequestCost, kmsComplianceFindings, kmsLifecycleEvent, tenantEncryptionContext } from "../index.js";

/**
 * Real-world governance example: design least-privilege key policy, estimate KMS
 * request cost, emit lifecycle event, and run compliance checks before release.
 */
export function buildKeyPolicyComplianceExample() {
  const aliasName = "alias/prod-orders-pii";
  const context = tenantEncryptionContext({ tenantId: "tenant-123", workload: "orders-api", purpose: "order-pii" });

  return {
    keyPolicy: applicationKeyPolicy({
      accountId: "123456789012",
      adminRoleArn: "arn:aws:iam::123456789012:role/security-kms-admin",
      appRoleArn: "arn:aws:iam::123456789012:role/orders-api-task",
      aliasName,
    }),
    monthlyRequestCostUsd: estimateKmsMonthlyRequestCost(2_500_000),
    lifecycleEvent: kmsLifecycleEvent({ keyRef: aliasName, eventType: "RotationEnabled", actorId: "security-admin", reason: "annual compliance control" }),
    compliance: kmsComplianceFindings({
      aliasName,
      rotationEnabled: true,
      encryptionContextKeys: Object.keys(context),
      tags: { Owner: "orders-team", DataClass: "restricted", CostCenter: "retail" },
      deletionWindowDays: 30,
    }),
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  console.log(JSON.stringify(buildKeyPolicyComplianceExample(), null, 2));
}
