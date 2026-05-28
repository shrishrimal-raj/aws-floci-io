import {
  CreateAliasCommand,
  CreateKeyCommand,
  DecryptCommand,
  DescribeKeyCommand,
  EncryptCommand,
  GenerateDataKeyCommand,
  KMSClient,
  ScheduleKeyDeletionCommand,
} from "@aws-sdk/client-kms";
import { client as defaultClient } from "../client.js";
import { KMSError } from "../errors.js";

const err = (op: string, e: unknown): never => {
  throw new KMSError(e instanceof Error && e.name ? e.name : "UNKNOWN", `KMS ${op} failed`, e);
};

function requireValue<T>(value: T | undefined, label: string): T {
  if (!value) throw new Error(`${label} missing`);
  return value;
}

export async function createKey(description = "floci lab key", kms: KMSClient = defaultClient): Promise<string> {
  try {
    const result = await kms.send(new CreateKeyCommand({ Description: description, KeyUsage: "ENCRYPT_DECRYPT", Origin: "AWS_KMS" }));
    return requireValue(result.KeyMetadata?.KeyId, "KeyId");
  } catch (e) {
    return err("createKey", e);
  }
}

export async function createAlias(aliasName: string, targetKeyId: string, kms: KMSClient = defaultClient): Promise<void> {
  try {
    await kms.send(
      new CreateAliasCommand({ AliasName: aliasName.startsWith("alias/") ? aliasName : `alias/${aliasName}`, TargetKeyId: targetKeyId })
    );
  } catch (e) {
    if (e instanceof Error && e.name === "AlreadyExistsException") return;
    return err("createAlias", e);
  }
}

export async function describeKey(keyId: string, kms: KMSClient = defaultClient) {
  try {
    return (await kms.send(new DescribeKeyCommand({ KeyId: keyId }))).KeyMetadata;
  } catch (e) {
    return err("describeKey", e);
  }
}

export async function encryptString(keyId: string, plaintext: string, kms: KMSClient = defaultClient): Promise<Uint8Array> {
  try {
    const result = await kms.send(new EncryptCommand({ KeyId: keyId, Plaintext: new TextEncoder().encode(plaintext) }));
    return requireValue(result.CiphertextBlob, "CiphertextBlob");
  } catch (e) {
    return err("encryptString", e);
  }
}

export async function decryptString(ciphertext: Uint8Array, kms: KMSClient = defaultClient): Promise<string> {
  try {
    const p = (await kms.send(new DecryptCommand({ CiphertextBlob: ciphertext }))).Plaintext;
    return p ? new TextDecoder().decode(p) : "";
  } catch (e) {
    return err("decryptString", e);
  }
}

export async function generateDataKey(keyId: string, bytes = 32, kms: KMSClient = defaultClient) {
  try {
    return await kms.send(new GenerateDataKeyCommand({ KeyId: keyId, NumberOfBytes: bytes }));
  } catch (e) {
    return err("generateDataKey", e);
  }
}

export async function scheduleKeyDeletion(keyId: string | undefined, kms: KMSClient = defaultClient): Promise<void> {
  if (!keyId) return;
  try {
    await kms.send(new ScheduleKeyDeletionCommand({ KeyId: keyId, PendingWindowInDays: 7 }));
  } catch (e) {
    if (e instanceof Error && e.name === "NotFoundException") return;
    return err("scheduleKeyDeletion", e);
  }
}
