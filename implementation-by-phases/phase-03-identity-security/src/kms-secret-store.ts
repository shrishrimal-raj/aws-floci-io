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

export function tenantEncryptionContext(tenantId: string, purpose: string): Record<string, string> {
  return { tenantId, purpose };
}
