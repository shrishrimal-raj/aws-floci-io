import {
  CreateAliasCommand,
  CreateKeyCommand,
  DecryptCommand,
  DescribeKeyCommand,
  EncryptCommand,
  GenerateDataKeyCommand,
  ScheduleKeyDeletionCommand,
  type GenerateDataKeyCommandOutput,
  type KMSClient,
} from "@aws-sdk/client-kms";
import { client as defaultClient } from "../client.js";
import { KMSError } from "../errors.js";

export interface KeyBundle {
  keyId: string;
  aliasName: string;
}

export interface EnvelopeDataKey {
  plaintextKey: Uint8Array;
  encryptedKey: Uint8Array;
}

export type EncryptionContext = Record<string, string>;

function awsErrorName(error: unknown): string {
  if (error instanceof KMSError && error.cause instanceof Error) return error.cause.name;
  return error instanceof Error ? error.name : "";
}

function wrapError(operation: string, error: unknown): never {
  const code = awsErrorName(error) || "UNKNOWN";
  throw new KMSError(code, `KMS ${operation} failed`, error);
}

function requireValue<T>(value: T | undefined, label: string): T {
  if (!value) throw new Error(`${label} missing`);
  return value;
}

function normalizedAlias(aliasName: string): string {
  return aliasName.startsWith("alias/") ? aliasName : `alias/${aliasName}`;
}

/**
 * Create symmetric KMS key for encrypt/decrypt operations.
 *
 * @example
 * const keyId = await createKey("app secrets");
 */
export async function createKey(description = "floci lab key", kms: KMSClient = defaultClient): Promise<string> {
  try {
    const result = await kms.send(new CreateKeyCommand({ Description: description, KeyUsage: "ENCRYPT_DECRYPT", Origin: "AWS_KMS" }));
    return requireValue(result.KeyMetadata?.KeyId, "KeyId");
  } catch (error) {
    wrapError("createKey", error);
  }
}

/**
 * Create alias for key; accepts names with or without `alias/` prefix.
 *
 * @example
 * await createAlias("alias/app", keyId);
 */
export async function createAlias(aliasName: string, targetKeyId: string, kms: KMSClient = defaultClient): Promise<void> {
  try {
    await kms.send(new CreateAliasCommand({ AliasName: normalizedAlias(aliasName), TargetKeyId: targetKeyId }));
  } catch (error) {
    if (awsErrorName(error) === "AlreadyExistsException") return;
    wrapError("createAlias", error);
  }
}

/**
 * Create key and alias together.
 *
 * @example
 * const bundle = await createKeyWithAlias("alias/app", "app key");
 */
export async function createKeyWithAlias(
  aliasName: string,
  description = "floci lab key",
  kms: KMSClient = defaultClient
): Promise<KeyBundle> {
  const keyId = await createKey(description, kms);
  const normalized = normalizedAlias(aliasName);
  await createAlias(normalized, keyId, kms);
  return { keyId, aliasName: normalized };
}

/**
 * Describe key metadata and state.
 *
 * @example
 * const metadata = await describeKey(keyId);
 */
export async function describeKey(keyId: string, kms: KMSClient = defaultClient) {
  try {
    return (await kms.send(new DescribeKeyCommand({ KeyId: keyId }))).KeyMetadata;
  } catch (error) {
    wrapError("describeKey", error);
  }
}

/**
 * Encrypt UTF-8 string and return ciphertext bytes.
 *
 * @example
 * const ciphertext = await encryptString(keyId, "secret");
 */
export async function encryptString(keyId: string, plaintext: string, kms: KMSClient = defaultClient, encryptionContext?: EncryptionContext): Promise<Uint8Array> {
  try {
    const result = await kms.send(new EncryptCommand({ KeyId: keyId, Plaintext: new TextEncoder().encode(plaintext), EncryptionContext: encryptionContext }));
    return requireValue(result.CiphertextBlob, "CiphertextBlob");
  } catch (error) {
    wrapError("encryptString", error);
  }
}

/**
 * Decrypt ciphertext bytes into UTF-8 string.
 *
 * @example
 * const plaintext = await decryptString(ciphertext);
 */
export async function decryptString(ciphertext: Uint8Array, kms: KMSClient = defaultClient, encryptionContext?: EncryptionContext): Promise<string> {
  try {
    const plaintext = (await kms.send(new DecryptCommand({ CiphertextBlob: ciphertext, EncryptionContext: encryptionContext }))).Plaintext;
    return plaintext ? new TextDecoder().decode(plaintext) : "";
  } catch (error) {
    wrapError("decryptString", error);
  }
}

/**
 * Generate KMS data key for envelope encryption.
 *
 * @example
 * const dataKey = await generateDataKey(keyId, 32);
 */
export async function generateDataKey(
  keyId: string,
  bytes = 32,
  kms: KMSClient = defaultClient,
  encryptionContext?: EncryptionContext
): Promise<GenerateDataKeyCommandOutput> {
  try {
    return await kms.send(new GenerateDataKeyCommand({ KeyId: keyId, NumberOfBytes: bytes, EncryptionContext: encryptionContext }));
  } catch (error) {
    wrapError("generateDataKey", error);
  }
}

/**
 * Generate data key and require both plaintext and encrypted forms.
 *
 * @example
 * const key = await generateEnvelopeDataKey(keyId);
 */
export async function generateEnvelopeDataKey(
  keyId: string,
  bytes = 32,
  kms: KMSClient = defaultClient,
  encryptionContext?: EncryptionContext
): Promise<EnvelopeDataKey> {
  const result = await generateDataKey(keyId, bytes, kms, encryptionContext);
  return {
    plaintextKey: requireValue(result.Plaintext, "Plaintext"),
    encryptedKey: requireValue(result.CiphertextBlob, "CiphertextBlob"),
  };
}

/**
 * Schedule KMS key deletion; undefined or missing keys are ignored.
 *
 * @example
 * await scheduleKeyDeletion(keyId);
 */
export async function scheduleKeyDeletion(keyId: string | undefined, kms: KMSClient = defaultClient): Promise<void> {
  if (!keyId) return;
  try {
    await kms.send(new ScheduleKeyDeletionCommand({ KeyId: keyId, PendingWindowInDays: 7 }));
  } catch (error) {
    if (awsErrorName(error) === "NotFoundException") return;
    wrapError("scheduleKeyDeletion", error);
  }
}
