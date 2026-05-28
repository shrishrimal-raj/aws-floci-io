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

export async function createBucket(bucket: string, s3: S3Client = defaultClient): Promise<void> {
  try {
    await s3.send(new CreateBucketCommand({ Bucket: bucket }));
  } catch (error) {
    const name = awsErrorName(error);
    if (name === "BucketAlreadyOwnedByYou" || name === "BucketAlreadyExists") return;
    wrapError("createBucket", error);
  }
}

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

export async function deleteObject(bucket: string, key: string, s3: S3Client = defaultClient): Promise<void> {
  try {
    await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  } catch (error) {
    wrapError("deleteObject", error);
  }
}

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

export async function deleteBucket(bucket: string, s3: S3Client = defaultClient): Promise<void> {
  try {
    await emptyBucket(bucket, s3);
    await s3.send(new DeleteBucketCommand({ Bucket: bucket }));
  } catch (error) {
    if (awsErrorName(error) === "NoSuchBucket") return;
    wrapError("deleteBucket", error);
  }
}

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
