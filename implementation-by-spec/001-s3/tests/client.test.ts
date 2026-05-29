import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import type { S3Client } from "@aws-sdk/client-s3";
import { client } from "../src/client.js";
import type { S3Error } from "../src/errors.js";
import {
  createBucket,
  createBrowserUploadSession,
  createPresignedGetUrl,
  createPresignedPutUrl,
  createPresignedPutUrlForObject,
  createSecureBrowserUploadSession,
  deleteBucket,
  deleteObject,
  enableVersioning,
  estimateMonthlyStorageCost,
  getJsonObject,
  getLifecycleRuleIds,
  getObjectAsString,
  getVersioningStatus,
  listObjects,
  emptyBucket,
  putJsonObject,
  putLifecycleExpirationRule,
  putObject,
  putObjectWithRetry,
  tenantObjectKey,
  writeAuditLogEntry,
  writeBackupManifest,
} from "../src/use-cases/object-storage.js";
import { waitForFloci } from "@floci-lab/test-utils";

const bucket = `floci-s3-test-${Date.now()}`;

function failingClient(name: string): S3Client {
  return {
    send: vi.fn(async () => {
      const error = new Error(`${name} failed`);
      error.name = name;
      throw error;
    }),
  } as unknown as S3Client;
}

describe("S3", () => {
  beforeAll(async () => {
    await waitForFloci();
    await createBucket(bucket);
  });

  afterAll(async () => {
    await deleteBucket(bucket);
  });

  it("client is configured against Floci", () => {
    expect(client).toBeDefined();
  });

  it("stores, reads, and lists objects by prefix", async () => {
    await putObject({
      bucket,
      key: "users/1/profile.json",
      body: JSON.stringify({ id: "1", name: "Ada" }),
      contentType: "application/json",
      metadata: { owner: "backend" },
    });

    await putObject({ bucket, key: "logs/ignored.txt", body: "ignore me" });

    await expect(
      getObjectAsString(bucket, "users/1/profile.json"),
    ).resolves.toContain("Ada");

    const objects = await listObjects(bucket, "users/");
    expect(objects.map((object) => object.key)).toEqual([
      "users/1/profile.json",
    ]);
  });

  it("stores and reads typed JSON documents", async () => {
    await putJsonObject({
      bucket,
      key: "users/2/profile.json",
      value: { id: "2", name: "Grace" },
    });

    await expect(
      getJsonObject<{ id: string; name: string }>(
        bucket,
        "users/2/profile.json",
      ),
    ).resolves.toEqual({
      id: "2",
      name: "Grace",
    });
  });

  it("enables versioning", async () => {
    await enableVersioning(bucket);
    await expect(getVersioningStatus(bucket)).resolves.toBe("Enabled");
  });

  it("stores lifecycle expiration rules", async () => {
    await putLifecycleExpirationRule({
      bucket,
      id: "expire-tmp",
      prefix: "tmp/",
      days: 3,
    });
    await expect(getLifecycleRuleIds(bucket)).resolves.toContain("expire-tmp");
  });

  it("creates presigned urls for uploads and downloads", async () => {
    const putUrl = await createPresignedPutUrl(
      bucket,
      "uploads/from-browser.txt",
      60,
    );
    const signedPutUrl = await createPresignedPutUrlForObject(
      {
        bucket,
        key: "uploads/signed.txt",
        contentType: "text/plain",
        metadata: { owner: "tests" },
      },
      60,
    );
    const getUrl = await createPresignedGetUrl(
      bucket,
      "users/1/profile.json",
      60,
    );
    const session = await createBrowserUploadSession(
      bucket,
      "uploads/avatar.png",
      60,
    );

    expect(putUrl).toContain(bucket);
    expect(putUrl).toContain("X-Amz-Signature");
    expect(signedPutUrl).toContain("X-Amz-Signature");
    expect(getUrl).toContain(bucket);
    expect(getUrl).toContain("X-Amz-Signature");
    expect(session.requiredHeaders["content-type"]).toBe(
      "application/octet-stream",
    );
    expect(session.putUrl).toContain("X-Amz-Signature");
  });

  it("builds secure tenant upload sessions", async () => {
    const key = tenantObjectKey({
      tenantId: "acme",
      userId: "user/1",
      category: "contracts",
      fileName: "msa.pdf",
    });
    expect(key).toBe("tenants/acme/users/user-1/contracts/msa.pdf");

    const session = await createSecureBrowserUploadSession({
      bucket,
      tenantId: "acme",
      userId: "user-1",
      category: "contracts",
      fileName: "msa.pdf",
      contentType: "application/pdf",
      maxBytes: 1_000_000,
      expiresInSeconds: 60,
    });

    expect(session.key).toBe("tenants/acme/users/user-1/contracts/msa.pdf");
    expect(session.requiredHeaders["content-type"]).toBe("application/pdf");
    expect(session.maxBytes).toBe(1_000_000);
    expect(session.putUrl).toContain("X-Amz-Signature");
  });

  it("writes audit logs and backup manifests", async () => {
    await writeAuditLogEntry(bucket, {
      eventId: "evt-1",
      timestamp: "2026-05-30T00:00:00.000Z",
      tenantId: "acme",
      actorId: "user-1",
      action: "ObjectRead",
      bucket,
      key: "users/1/profile.json",
      outcome: "ALLOW",
    });

    const manifest = await writeBackupManifest(bucket, "users/");
    expect(manifest.objectCount).toBeGreaterThanOrEqual(1);
    expect(
      (await listObjects(bucket, "audit/tenant=acme/date=2026-05-30/")).length,
    ).toBe(1);
    expect((await listObjects(bucket, "backup-manifests/")).length).toBe(1);
  });

  it("estimates cost and retries transient uploads", async () => {
    const estimate = estimateMonthlyStorageCost({
      storageGb: 100,
      putRequests: 10_000,
      getRequests: 50_000,
    });
    expect(estimate.totalUsd).toBeCloseTo(2.37);

    await putObjectWithRetry(
      { bucket, key: "retry/success.txt", body: "ok" },
      { attempts: 2, baseDelayMs: 1 },
    );
    await expect(getObjectAsString(bucket, "retry/success.txt")).resolves.toBe(
      "ok",
    );
  });

  it("deletes single objects and can explicitly empty buckets", async () => {
    await putObject({
      bucket,
      key: "cleanup/delete-me.txt",
      body: "temporary",
    });
    await deleteObject(bucket, "cleanup/delete-me.txt");
    expect(await listObjects(bucket, "cleanup/")).toEqual([]);

    await putObject({ bucket, key: "cleanup/empty-me.txt", body: "temporary" });
    await emptyBucket(bucket);
    expect(await listObjects(bucket, "")).toEqual([]);
  });

  it("wraps SDK write failures in S3Error", async () => {
    await expect(
      putObject({ bucket, key: "x", body: "x" }, failingClient("AccessDenied")),
    ).rejects.toMatchObject({
      code: "S3_AccessDenied",
      message: "S3 putObject failed",
    } satisfies Partial<S3Error>);
  });

  it("wraps SDK read failures in S3Error", async () => {
    await expect(
      listObjects(bucket, "", failingClient("NoSuchBucket")),
    ).rejects.toMatchObject({
      code: "S3_NoSuchBucket",
      message: "S3 listObjects failed",
    } satisfies Partial<S3Error>);
  });
});
