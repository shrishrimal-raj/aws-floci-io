import {
  DecryptCommand,
  EncryptCommand,
  GenerateDataKeyCommand,
  type KMSClient,
} from "@aws-sdk/client-kms";

export interface EncryptedSecret {
  keyId: string;
  ciphertext: string;
  encryptionContext: Record<string, string>;
}

export class KmsSecretStore {
  constructor(private readonly kms: KMSClient, private readonly keyId: string) {}

  /**
   * Encrypts JSON value with KMS and tenant-bound encryption context.
   *
   * Example: store tenant OAuth refresh token encrypted with `{ tenantId, purpose: "oauth-refresh-token" }`.
   */
  async encryptJson(value: unknown, encryptionContext: Record<string, string>): Promise<EncryptedSecret> {
    const result = await this.kms.send(
      new EncryptCommand({
        KeyId: this.keyId,
        Plaintext: Buffer.from(JSON.stringify(value)),
        EncryptionContext: encryptionContext,
      })
    );
    if (!result.CiphertextBlob) throw new Error("KMS encrypt returned no ciphertext");
    return { keyId: this.keyId, ciphertext: Buffer.from(result.CiphertextBlob).toString("base64"), encryptionContext };
  }

  /**
   * Decrypts JSON only when same encryption context is supplied.
   *
   * Example: tenant-b cannot decrypt tenant-a ciphertext because KMS encryption context must match exactly.
   */
  async decryptJson<T>(secret: EncryptedSecret): Promise<T> {
    const result = await this.kms.send(
      new DecryptCommand({
        CiphertextBlob: Buffer.from(secret.ciphertext, "base64"),
        EncryptionContext: secret.encryptionContext,
      })
    );
    if (!result.Plaintext) throw new Error("KMS decrypt returned no plaintext");
    return JSON.parse(Buffer.from(result.Plaintext).toString("utf8")) as T;
  }

  /**
   * Generates envelope encryption data key for large tenant payloads.
   *
   * Example: encrypt large export file locally with `plaintextKey`, store only `encryptedKey` beside S3 object metadata.
   */
  async generateEnvelopeKey(encryptionContext: Record<string, string>): Promise<{ plaintextKey: Buffer; encryptedKey: string }> {
    const result = await this.kms.send(
      new GenerateDataKeyCommand({ KeyId: this.keyId, KeySpec: "AES_256", EncryptionContext: encryptionContext })
    );
    if (!result.Plaintext || !result.CiphertextBlob) throw new Error("KMS data key incomplete");
    return {
      plaintextKey: Buffer.from(result.Plaintext),
      encryptedKey: Buffer.from(result.CiphertextBlob).toString("base64"),
    };
  }
}

/**
 * Builds required KMS encryption context for tenant-scoped secrets.
 *
 * Example: `tenantEncryptionContext("tenant-a", "stripe-api-key")` binds ciphertext to tenant and secret purpose.
 */
export function tenantEncryptionContext(tenantId: string, purpose: string): Record<string, string> {
  return { tenantId, purpose };
}

/**
 * Redacts encrypted secret fields for audit logs.
 *
 * Example: log key ID and context during incident response while hiding ciphertext value.
 */
export function redactEncryptedSecret(secret: EncryptedSecret): Record<string, unknown> {
  return { keyId: secret.keyId, ciphertext: "[REDACTED]", encryptionContext: secret.encryptionContext };
}
