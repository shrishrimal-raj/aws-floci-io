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
      })
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
export async function getVersioningStatus(
  bucket: string,
  s3: S3Client = defaultClient
): Promise<string | undefined> {
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
export async function putLifecycleExpirationRule(
  input: LifecycleExpirationRuleInput,
  s3: S3Client = defaultClient
): Promise<void> {
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
      })
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
export async function getLifecycleRuleIds(
  bucket: string,
  s3: S3Client = defaultClient
): Promise<string[]> {
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
      })
    );
    return result.VersionId;
  } catch (error) {
    wrapError("putObject", error);
  }
}

/**
 * Store JSON with correct content type and stable serialization.
 *
 * @example
 * await putJsonObject({ bucket: "floci-s3-lab", key: "users/1.json", value: { id: "1" } });
 */
export async function putJsonObject<TValue>(
  input: PutJsonObjectInput<TValue>,
  s3: S3Client = defaultClient
): Promise<string | undefined> {
  return putObject(
    {
      bucket: input.bucket,
      key: input.key,
      body: JSON.stringify(input.value),
      contentType: "application/json",
      metadata: input.metadata,
    },
    s3
  );
}

/**
 * Download an object body as UTF-8 text.
 *
 * @example
 * const text = await getObjectAsString("floci-s3-lab", "docs/readme.txt");
 */
export async function getObjectAsString(
  bucket: string,
  key: string,
  s3: S3Client = defaultClient
): Promise<string> {
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
export async function getJsonObject<TValue>(
  bucket: string,
  key: string,
  s3: S3Client = defaultClient
): Promise<TValue> {
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
export async function listObjects(
  bucket: string,
  prefix = "",
  s3: S3Client = defaultClient
): Promise<StoredObject[]> {
  try {
    const objects: StoredObject[] = [];
    let continuationToken: string | undefined;

    do {
      const result = await s3.send(
        new ListObjectsV2Command({
          Bucket: bucket,
          Prefix: prefix,
          ContinuationToken: continuationToken,
        })
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
          Delete: { Objects: unversionedObjects.map((object) => ({ Key: object.key })), Quiet: true },
        })
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
        })
      );
      const objects: ObjectIdentifier[] = [
        ...(result.Versions ?? []),
        ...(result.DeleteMarkers ?? []),
      ].flatMap((object) =>
        object.Key
          ? [{ Key: object.Key, ...(object.VersionId && { VersionId: object.VersionId }) }]
          : []
      );

      if (objects.length > 0) {
        await s3.send(new DeleteObjectsCommand({ Bucket: bucket, Delete: { Objects: objects, Quiet: true } }));
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
export async function createPresignedPutUrl(
  bucket: string,
  key: string,
  expiresInSeconds = 900,
  s3: S3Client = defaultClient
): Promise<string> {
  try {
    return await getSignedUrl(s3, new PutObjectCommand({ Bucket: bucket, Key: key }), {
      expiresIn: expiresInSeconds,
    });
  } catch (error) {
    wrapError("createPresignedPutUrl", error);
  }
}

/**
 * Create a short-lived download URL for private objects.
 *
 * @example
 * const url = await createPresignedGetUrl("floci-s3-lab", "uploads/avatar.png", 300);
 */
export async function createPresignedGetUrl(
  bucket: string,
  key: string,
  expiresInSeconds = 900,
  s3: S3Client = defaultClient
): Promise<string> {
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
export async function createBrowserUploadSession(
  bucket: string,
  key: string,
  expiresInSeconds = 900,
  s3: S3Client = defaultClient
): Promise<BrowserUploadSession> {
  const [putUrl, getUrl] = await Promise.all([
    createPresignedPutUrl(bucket, key, expiresInSeconds, s3),
    createPresignedGetUrl(bucket, key, expiresInSeconds, s3),
  ]);

  return {
    key,
    putUrl,
    getUrl,
    expiresInSeconds,
    requiredHeaders: { "content-type": "application/octet-stream" },
  };
}
