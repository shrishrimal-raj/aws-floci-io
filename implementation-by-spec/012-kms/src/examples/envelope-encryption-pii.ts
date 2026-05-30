#!/usr/bin/env tsx
import { pathToFileURL } from "node:url";
import { createKeyWithAlias, generateEnvelopeDataKey, kmsAuditEvent, scheduleKeyDeletion, tenantEncryptionContext } from "../index.js";

/**
 * Real-world PII example: request one KMS data key for envelope encryption.
 * App would use plaintext key locally for AES-GCM, store only encrypted data key,
 * ciphertext, and encryption context metadata. Plaintext key is never logged.
 */
export async function runEnvelopeEncryptionPiiExample() {
  const bundle = await createKeyWithAlias(`alias/pii-records-${Date.now()}`, "customer PII envelope key");
  const context = tenantEncryptionContext({ tenantId: "tenant-123", workload: "customer-profile", purpose: "pii-field-encryption", dataClass: "restricted" });

  try {
    const dataKey = await generateEnvelopeDataKey(bundle.keyId, 32, undefined, context);
    const storageRecord = {
      partitionKey: "tenant-123#customer-456",
      encryptedDataKeyBytes: dataKey.encryptedKey.byteLength,
      plaintextKeyBytesUsedThenDiscarded: dataKey.plaintextKey.byteLength,
      encryptionContext: context,
      algorithm: "AES-256-GCM",
    };
    const audit = kmsAuditEvent({
      action: "GenerateDataKey",
      keyRef: bundle.aliasName,
      result: "ALLOW",
      context: { tenantId: "tenant-123", actorId: "customer-profile", requestId: "req-002", workload: "customer-profile" },
      metadata: { encryptedDataKeyBytes: storageRecord.encryptedDataKeyBytes, algorithm: storageRecord.algorithm },
    });

    return { storageRecord, audit };
  } finally {
    await scheduleKeyDeletion(bundle.keyId);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  console.log(await runEnvelopeEncryptionPiiExample());
}
