import { redactEncryptedSecret, tenantEncryptionContext, type EncryptedSecret } from "../kms-secret-store.js";
import { securityLifecycleDecision } from "../enterprise-patterns.js";

/**
 * Real-world secret lifecycle pattern: bind encrypted secrets to tenant context and decide rotation/disable actions.
 */
export function tenantSecretRotationExample() {
  const encrypted: EncryptedSecret = {
    keyId: "alias/tenant-secrets",
    ciphertext: "base64-ciphertext",
    encryptionContext: tenantEncryptionContext("tenant-a", "stripe-api-key"),
  };

  return {
    redactedSecret: redactEncryptedSecret(encrypted),
    lifecycle: securityLifecycleDecision(
      "2026-01-01T00:00:00.000Z",
      "2025-01-01T00:00:00.000Z",
      { rotateSecretsAfterDays: 90, disableInactiveUsersAfterDays: 180 },
      new Date("2026-05-30T00:00:00.000Z")
    ),
  };
}
