#!/usr/bin/env tsx
import { pathToFileURL } from "node:url";
import { createKeyWithAlias, decryptString, encryptString, kmsAuditEvent, retryKmsOperation, scheduleKeyDeletion, tenantEncryptionContext } from "../index.js";

/**
 * Real-world SaaS example: encrypt one tenant secret with encryption context,
 * retry transient KMS failures, write audit events, then decrypt with same context.
 */
export async function runTenantEncryptionContextExample() {
  const bundle = await createKeyWithAlias(`alias/tenant-payments-${Date.now()}`, "tenant payment secrets key");
  const context = tenantEncryptionContext({ tenantId: "tenant-123", workload: "payments-api", purpose: "stripe-webhook-secret" });

  try {
    const ciphertext = await retryKmsOperation(
      () => encryptString(bundle.keyId, "whsec_live_example", undefined, context),
      { maxAttempts: 3, baseDelayMs: 100, maxDelayMs: 1_000, retryableErrors: ["ThrottlingException", "DependencyTimeoutException"] }
    );
    const plaintext = await decryptString(ciphertext, undefined, context);
    const audit = kmsAuditEvent(
      {
        action: "Decrypt",
        keyRef: bundle.aliasName,
        result: "ALLOW",
        context: { tenantId: "tenant-123", actorId: "payments-api", requestId: "req-001", workload: "payments-api" },
        metadata: { contextKeys: Object.keys(context).join(","), plaintextReturned: plaintext.length > 0 },
      },
      new Date("2024-06-01T10:00:00Z")
    );

    return { aliasName: bundle.aliasName, ciphertextBytes: ciphertext.byteLength, plaintext, audit };
  } finally {
    await scheduleKeyDeletion(bundle.keyId);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  console.log(await runTenantEncryptionContextExample());
}
