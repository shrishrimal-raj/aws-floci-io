import {
  CreateBucketCommand,
  DeleteBucketCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  GetBucketLifecycleConfigurationCommand,
  GetBucketVersioningCommand,
  ListObjectVersionsCommand,
  ListObjectsV2Command,
  PutBucketLifecycleConfigurationCommand,
  PutBucketVersioningCommand,
  PutObjectCommand,
  type _Object,
  type ObjectIdentifier,
  type S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { client as defaultClient } from "../client.js";
import { S3Error } from "../errors.js";

export interface StoredObject {
  key: string;
  size: number;
  lastModified?: Date;
}

export interface PutObjectInput {
  bucket: string;
  key: string;
  body: string | Uint8Array | Buffer;
  contentType?: string;
  metadata?: Record<string, string>;
}

export interface LifecycleExpirationRuleInput {
  bucket: string;
  id: string;
  prefix?: string;
  days: number;
}

export interface PutJsonObjectInput<TValue> {
  bucket: string;
  key: string;
  value: TValue;
  metadata?: Record<string, string>;
}

export interface BrowserUploadSession {
  key: string;
  putUrl: string;
  getUrl: string;
  expiresInSeconds: number;
  requiredHeaders: Record<string, string>;
}

export interface TenantObjectKeyInput {
  tenantId: string;
  userId?: string;
  category: string;
  fileName: string;
}

export interface SecureBrowserUploadInput extends TenantObjectKeyInput {
  bucket: string;
  contentType: string;
  maxBytes: number;
  expiresInSeconds?: number;
  metadata?: Record<string, string>;
}

export interface SecureBrowserUploadSession extends BrowserUploadSession {
  tenantId: string;
  maxBytes: number;
}

export interface RetryOptions {
  attempts?: number;
  baseDelayMs?: number;
  shouldRetry?: (error: unknown) => boolean;
}

export interface AuditLogEntry {
  eventId: string;
  timestamp: string;
  tenantId: string;
  actorId: string;
  action: string;
  bucket: string;
  key: string;
  outcome: "ALLOW" | "DENY" | "ERROR";
  reason?: string;
  requestId?: string;
}

export interface BackupManifest {
  generatedAt: string;
  sourceBucket: string;
  prefix: string;
  objectCount: number;
  totalBytes: number;
  objects: StoredObject[];
}

export interface StorageCostEstimateInput {
  storageGb: number;
  putRequests?: number;
  getRequests?: number;
  storageUsdPerGbMonth?: number;
  putUsdPer1k?: number;
  getUsdPer1k?: number;
}

export interface StorageCostEstimate {
  storageUsd: number;
  putRequestUsd: number;
  getRequestUsd: number;
  totalUsd: number;
}

export interface S3UriParts {
  bucket: string;
  key: string;
}

function awsErrorName(error: unknown): string {
  if (error instanceof S3Error && error.cause instanceof Error) return error.cause.name;
  return error instanceof Error ? error.name : "";
}

function wrapError(operation: string, error: unknown): never {
  const code = awsErrorName(error) || "UNKNOWN";
  throw new S3Error(code, `S3 ${operation} failed`, error);
}

function toStoredObject(object: _Object): StoredObject | undefined {
  if (!object.Key) return undefined;
  return {
    key: object.Key,
    size: object.Size ?? 0,
    ...(object.LastModified && { lastModified: object.LastModified }),
  };
}

function sanitizeKeyPart(value: string): string {
  return value
    .trim()
    .replace(/^\/+|\/+$/g, "")
    .replace(/\.\./g, "")
    .replace(/[^a-zA-Z0-9._=-]+/g, "-");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function defaultShouldRetry(error: unknown): boolean {
  const name = awsErrorName(error);
  return ["SlowDown", "RequestTimeout", "Throttling", "InternalError", "ServiceUnavailable"].includes(name);
}

/**
 * Build a tenant-safe S3 key prefix for multi-user SaaS objects.
 *
 * @example
 * tenantObjectKey({ tenantId: "acme", userId: "u1", category: "invoices", fileName: "may.pdf" });
 */
export function tenantObjectKey(input: TenantObjectKeyInput): string {
  const tenantId = sanitizeKeyPart(input.tenantId);
  const userId = input.userId ? sanitizeKeyPart(input.userId) : undefined;
  const category = sanitizeKeyPart(input.category);
  const fileName = sanitizeKeyPart(input.fileName);
  if (!tenantId || !category || !fileName) throw new S3Error("VALIDATION", "tenantId, category, and fileName are required");
  return ["tenants", tenantId, userId && "users", userId, category, fileName].filter(Boolean).join("/");
}

/**
 * Build a canonical `s3://bucket/key` URI for integrations with Glue, Athena, Lambda,
 * Step Functions, EventBridge payloads, backup manifests, and audit evidence.
 *
 * @example
 * s3Uri("enterprise-documents", "tenants/acme/contracts/msa.pdf");
 */
export function s3Uri(bucket: string, key: string): string {
  const normalizedBucket = bucket.trim();
  const normalizedKey = key.replace(/^\/+/, "");
  if (!normalizedBucket || !normalizedKey) throw new S3Error("VALIDATION", "bucket and key are required");
  return `s3://${normalizedBucket}/${normalizedKey}`;
}

/**
 * Parse an `s3://bucket/key` URI back into bucket and key parts.
 * Use this in workers that consume object references from EventBridge, SQS, or manifests.
 *
 * @example
 * parseS3Uri("s3://enterprise-documents/tenants/acme/contracts/msa.pdf");
 */
export function parseS3Uri(uri: string): S3UriParts {
  if (!uri.startsWith("s3://")) throw new S3Error("VALIDATION", "S3 URI must start with s3://");
  const withoutScheme = uri.slice("s3://".length);
  const separatorIndex = withoutScheme.indexOf("/");
  if (separatorIndex <= 0 || separatorIndex === withoutScheme.length - 1) throw new S3Error("VALIDATION", "S3 URI must include bucket and key");
  return {
    bucket: withoutScheme.slice(0, separatorIndex),
    key: withoutScheme.slice(separatorIndex + 1),
  };
}

/**
 * Estimate simple S3 monthly storage cost for design discussions and examples.
 * Defaults are illustrative us-east-1-style rates; verify live AWS Pricing before production use.
 *
 * @example
 * estimateMonthlyStorageCost({ storageGb: 500, putRequests: 100000, getRequests: 1000000 });
 */
export function estimateMonthlyStorageCost(input: StorageCostEstimateInput): StorageCostEstimate {
  const storageUsd = input.storageGb * (input.storageUsdPerGbMonth ?? 0.023);
  const putRequestUsd = ((input.putRequests ?? 0) / 1000) * (input.putUsdPer1k ?? 0.005);
  const getRequestUsd = ((input.getRequests ?? 0) / 1000) * (input.getUsdPer1k ?? 0.0004);
  const totalUsd = storageUsd + putRequestUsd + getRequestUsd;
  return { storageUsd, putRequestUsd, getRequestUsd, totalUsd };
}

/**
 * Create an idempotent S3 bucket for lab resources.
 *
 * @example
 * await createBucket("floci-s3-lab");
 */
export async function createBucket(bucket: string, s3: S3Client = defaultClient): Promise<void> {
  try {
    await s3.send(new CreateBucketCommand({ Bucket: bucket }));
  } catch (error) {
    const name = awsErrorName(error);
    if (name === "BucketAlreadyOwnedByYou" || name === "BucketAlreadyExists") return;
    wrapError("createBucket", error);
  }
}

/**
 * Enable object versioning for safer overwrites and deletes.
 *
 * @example
 * await enableVersioning("floci-s3-lab");
 */
export async function enableVersioning(bucket: string, s3: S3Client = defaultClient): Promise<void> {
  try {
    await s3.send(
      new PutBucketVersioningCommand({
        Bucket: bucket,
        VersioningConfiguration: { Status: "Enabled" },
      }),
    );
  } catch (error) {
    wrapError("enableVersioning", error);
  }
}

/**
 * Read current bucket versioning status.
 *
 * @example
 * const status = await getVersioningStatus("floci-s3-lab");
 */
export async function getVersioningStatus(bucket: string, s3: S3Client = defaultClient): Promise<string | undefined> {
  try {
    const result = await s3.send(new GetBucketVersioningCommand({ Bucket: bucket }));
    return result.Status;
  } catch (error) {
    wrapError("getVersioningStatus", error);
  }
}

/**
 * Store a lifecycle expiration rule for a prefix.
 *
 * @example
 * await putLifecycleExpirationRule({ bucket: "floci-s3-lab", id: "expire-tmp", prefix: "tmp/", days: 7 });
 */
export async function putLifecycleExpirationRule(input: LifecycleExpirationRuleInput, s3: S3Client = defaultClient): Promise<void> {
  try {
    await s3.send(
      new PutBucketLifecycleConfigurationCommand({
        Bucket: input.bucket,
        LifecycleConfiguration: {
          Rules: [
            {
              ID: input.id,
              Status: "Enabled",
              Filter: { Prefix: input.prefix ?? "" },
              Expiration: { Days: input.days },
            },
          ],
        },
      }),
    );
  } catch (error) {
    wrapError("putLifecycleExpirationRule", error);
  }
}

/**
 * List lifecycle rule IDs configured on a bucket.
 *
 * @example
 * const ids = await getLifecycleRuleIds("floci-s3-lab");
 */
export async function getLifecycleRuleIds(bucket: string, s3: S3Client = defaultClient): Promise<string[]> {
  try {
    const result = await s3.send(new GetBucketLifecycleConfigurationCommand({ Bucket: bucket }));
    return result.Rules?.map((rule) => rule.ID).filter((id): id is string => Boolean(id)) ?? [];
  } catch (error) {
    wrapError("getLifecycleRuleIds", error);
  }
}

/**
 * Upload raw bytes or text to S3.
 *
 * @example
 * await putObject({ bucket: "floci-s3-lab", key: "docs/readme.txt", body: "hello" });
 */
export async function putObject(input: PutObjectInput, s3: S3Client = defaultClient): Promise<string | undefined> {
  try {
    const result = await s3.send(
      new PutObjectCommand({
        Bucket: input.bucket,
        Key: input.key,
        Body: input.body,
        ContentType: input.contentType,
        Metadata: input.metadata,
      }),
    );
    return result.VersionId;
  } catch (error) {
    wrapError("putObject", error);
  }
}

/**
 * Upload with bounded exponential backoff for transient S3 failures.
 *
 * @example
 * await putObjectWithRetry({ bucket, key, body: report }, { attempts: 4 });
 */
export async function putObjectWithRetry(input: PutObjectInput, options: RetryOptions = {}, s3: S3Client = defaultClient): Promise<string | undefined> {
  const attempts = options.attempts ?? 3;
  const baseDelayMs = options.baseDelayMs ?? 100;
  const shouldRetry = options.shouldRetry ?? defaultShouldRetry;
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await putObject(input, s3);
    } catch (error) {
      lastError = error;
      if (attempt === attempts || !shouldRetry(error)) throw error;
      await sleep(baseDelayMs * 2 ** (attempt - 1));
    }
  }

  throw lastError;
}

/**
 * Store JSON with correct content type and stable serialization.
 *
 * @example
 * await putJsonObject({ bucket: "floci-s3-lab", key: "users/1.json", value: { id: "1" } });
 */
export async function putJsonObject<TValue>(input: PutJsonObjectInput<TValue>, s3: S3Client = defaultClient): Promise<string | undefined> {
  return putObject(
    {
      bucket: input.bucket,
      key: input.key,
      body: JSON.stringify(input.value),
      contentType: "application/json",
      metadata: input.metadata,
    },
    s3,
  );
}

/**
 * Download an object body as UTF-8 text.
 *
 * @example
 * const text = await getObjectAsString("floci-s3-lab", "docs/readme.txt");
 */
export async function getObjectAsString(bucket: string, key: string, s3: S3Client = defaultClient): Promise<string> {
  try {
    const result = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    if (!result.Body) return "";
    return await result.Body.transformToString();
  } catch (error) {
    wrapError("getObjectAsString", error);
  }
}

/**
 * Download and parse a JSON object.
 *
 * @example
 * const profile = await getJsonObject<{ id: string }>("floci-s3-lab", "users/1.json");
 */
export async function getJsonObject<TValue>(bucket: string, key: string, s3: S3Client = defaultClient): Promise<TValue> {
  try {
    return JSON.parse(await getObjectAsString(bucket, key, s3)) as TValue;
  } catch (error) {
    if (error instanceof S3Error) throw error;
    wrapError("getJsonObject", error);
  }
}

/**
 * List objects under a prefix with pagination.
 *
 * @example
 * const objects = await listObjects("floci-s3-lab", "users/");
 */
export async function listObjects(bucket: string, prefix = "", s3: S3Client = defaultClient): Promise<StoredObject[]> {
  try {
    const objects: StoredObject[] = [];
    let continuationToken: string | undefined;

    do {
      const result = await s3.send(
        new ListObjectsV2Command({
          Bucket: bucket,
          Prefix: prefix,
          ContinuationToken: continuationToken,
        }),
      );
      for (const item of result.Contents ?? []) {
        const object = toStoredObject(item);
        if (object) objects.push(object);
      }
      continuationToken = result.NextContinuationToken;
    } while (continuationToken);

    return objects;
  } catch (error) {
    wrapError("listObjects", error);
  }
}

/**
 * Delete one object by key.
 *
 * @example
 * await deleteObject("floci-s3-lab", "docs/readme.txt");
 */
export async function deleteObject(bucket: string, key: string, s3: S3Client = defaultClient): Promise<void> {
  try {
    await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  } catch (error) {
    wrapError("deleteObject", error);
  }
}

/**
 * Remove every current object, object version, and delete marker from a bucket.
 *
 * @example
 * await emptyBucket("floci-s3-lab");
 */
export async function emptyBucket(bucket: string, s3: S3Client = defaultClient): Promise<void> {
  try {
    const unversionedObjects = await listObjects(bucket, "", s3);
    if (unversionedObjects.length > 0) {
      await s3.send(
        new DeleteObjectsCommand({
          Bucket: bucket,
          Delete: {
            Objects: unversionedObjects.map((object) => ({ Key: object.key })),
            Quiet: true,
          },
        }),
      );
    }

    let keyMarker: string | undefined;
    let versionIdMarker: string | undefined;

    do {
      const result = await s3.send(
        new ListObjectVersionsCommand({
          Bucket: bucket,
          KeyMarker: keyMarker,
          VersionIdMarker: versionIdMarker,
        }),
      );
      const objects: ObjectIdentifier[] = [...(result.Versions ?? []), ...(result.DeleteMarkers ?? [])].flatMap((object) =>
        object.Key
          ? [
              {
                Key: object.Key,
                ...(object.VersionId && { VersionId: object.VersionId }),
              },
            ]
          : [],
      );

      if (objects.length > 0) {
        await s3.send(
          new DeleteObjectsCommand({
            Bucket: bucket,
            Delete: { Objects: objects, Quiet: true },
          }),
        );
      }

      keyMarker = result.NextKeyMarker;
      versionIdMarker = result.NextVersionIdMarker;
    } while (keyMarker || versionIdMarker);
  } catch (error) {
    wrapError("emptyBucket", error);
  }
}

/**
 * Empty then delete a bucket; missing buckets are treated as already cleaned up.
 *
 * @example
 * await deleteBucket("floci-s3-lab");
 */
export async function deleteBucket(bucket: string, s3: S3Client = defaultClient): Promise<void> {
  try {
    await emptyBucket(bucket, s3);
    await s3.send(new DeleteBucketCommand({ Bucket: bucket }));
  } catch (error) {
    if (awsErrorName(error) === "NoSuchBucket") return;
    wrapError("deleteBucket", error);
  }
}

/**
 * Create a short-lived upload URL for browser or mobile clients.
 *
 * @example
 * const url = await createPresignedPutUrl("floci-s3-lab", "uploads/avatar.png", 300);
 */
export async function createPresignedPutUrl(bucket: string, key: string, expiresInSeconds = 900, s3: S3Client = defaultClient): Promise<string> {
  try {
    return await getSignedUrl(s3, new PutObjectCommand({ Bucket: bucket, Key: key }), {
      expiresIn: expiresInSeconds,
    });
  } catch (error) {
    wrapError("createPresignedPutUrl", error);
  }
}

/**
 * Create upload URL that signs content type and metadata for safer browser uploads.
 *
 * @example
 * const url = await createPresignedPutUrlForObject({ bucket, key, body: "", contentType: "application/pdf" });
 */
export async function createPresignedPutUrlForObject(input: Omit<PutObjectInput, "body"> & { body?: PutObjectInput["body"] }, expiresInSeconds = 900, s3: S3Client = defaultClient): Promise<string> {
  try {
    return await getSignedUrl(
      s3,
      new PutObjectCommand({
        Bucket: input.bucket,
        Key: input.key,
        Body: input.body,
        ContentType: input.contentType,
        Metadata: input.metadata,
      }),
      { expiresIn: expiresInSeconds },
    );
  } catch (error) {
    wrapError("createPresignedPutUrlForObject", error);
  }
}

/**
 * Create a short-lived download URL for private objects.
 *
 * @example
 * const url = await createPresignedGetUrl("floci-s3-lab", "uploads/avatar.png", 300);
 */
export async function createPresignedGetUrl(bucket: string, key: string, expiresInSeconds = 900, s3: S3Client = defaultClient): Promise<string> {
  try {
    return await getSignedUrl(s3, new GetObjectCommand({ Bucket: bucket, Key: key }), {
      expiresIn: expiresInSeconds,
    });
  } catch (error) {
    wrapError("createPresignedGetUrl", error);
  }
}

/**
 * Build paired upload/download presigned URLs plus required browser headers.
 *
 * @example
 * const session = await createBrowserUploadSession("floci-s3-lab", "uploads/avatar.png");
 */
export async function createBrowserUploadSession(bucket: string, key: string, expiresInSeconds = 900, s3: S3Client = defaultClient): Promise<BrowserUploadSession> {
  const [putUrl, getUrl] = await Promise.all([createPresignedPutUrl(bucket, key, expiresInSeconds, s3), createPresignedGetUrl(bucket, key, expiresInSeconds, s3)]);

  return {
    key,
    putUrl,
    getUrl,
    expiresInSeconds,
    requiredHeaders: { "content-type": "application/octet-stream" },
  };
}

/**
 * Create an enterprise browser upload session scoped to tenant/user/category.
 * Signs content type and metadata; caller should also enforce maxBytes in API/browser validation.
 *
 * @example
 * await createSecureBrowserUploadSession({ bucket, tenantId: "acme", userId: "u1", category: "contracts", fileName: "msa.pdf", contentType: "application/pdf", maxBytes: 10_000_000 });
 */
export async function createSecureBrowserUploadSession(input: SecureBrowserUploadInput, s3: S3Client = defaultClient): Promise<SecureBrowserUploadSession> {
  if (input.maxBytes <= 0) throw new S3Error("VALIDATION", "maxBytes must be greater than zero");
  const key = tenantObjectKey(input);
  const expiresInSeconds = input.expiresInSeconds ?? 300;
  const metadata = {
    tenantId: input.tenantId,
    ...(input.userId && { userId: input.userId }),
    maxBytes: String(input.maxBytes),
    ...input.metadata,
  };

  const [putUrl, getUrl] = await Promise.all([createPresignedPutUrlForObject({ bucket: input.bucket, key, contentType: input.contentType, metadata }, expiresInSeconds, s3), createPresignedGetUrl(input.bucket, key, expiresInSeconds, s3)]);

  return {
    key,
    putUrl,
    getUrl,
    expiresInSeconds,
    requiredHeaders: { "content-type": input.contentType },
    tenantId: input.tenantId,
    maxBytes: input.maxBytes,
  };
}

/**
 * Write immutable-style JSON audit entry under an audit prefix.
 *
 * @example
 * await writeAuditLogEntry("audit-bucket", { eventId: "evt1", timestamp: new Date().toISOString(), tenantId: "acme", actorId: "u1", action: "ObjectDownloaded", bucket, key, outcome: "ALLOW" });
 */
export async function writeAuditLogEntry(auditBucket: string, entry: AuditLogEntry, s3: S3Client = defaultClient): Promise<string | undefined> {
  const day = entry.timestamp.slice(0, 10);
  const key = `audit/tenant=${sanitizeKeyPart(entry.tenantId)}/date=${day}/${sanitizeKeyPart(entry.eventId)}.json`;
  return putJsonObject(
    {
      bucket: auditBucket,
      key,
      value: entry,
      metadata: { tenantId: entry.tenantId },
    },
    s3,
  );
}

/**
 * Build and store a backup manifest for one prefix. Use with versioning/replication in production.
 *
 * @example
 * const manifest = await writeBackupManifest(bucket, "tenants/acme/");
 */
export async function writeBackupManifest(bucket: string, prefix: string, s3: S3Client = defaultClient): Promise<BackupManifest> {
  const objects = await listObjects(bucket, prefix, s3);
  const manifest: BackupManifest = {
    generatedAt: new Date().toISOString(),
    sourceBucket: bucket,
    prefix,
    objectCount: objects.length,
    totalBytes: objects.reduce((sum, object) => sum + object.size, 0),
    objects,
  };
  await putJsonObject({ bucket, key: `backup-manifests/${Date.now()}.json`, value: manifest }, s3);
  return manifest;
}
