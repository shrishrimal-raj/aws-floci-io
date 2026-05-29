import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import type { S3Client } from "@aws-sdk/client-s3";
import { client } from "../src/client.js";
import type { S3Error } from "../src/errors.js";
import {
  createBucket,
  createBrowserUploadSession,
  createPresignedGetUrl,
  createPresignedPutUrl,
  deleteBucket,
  enableVersioning,
  getJsonObject,
  getLifecycleRuleIds,
  getObjectAsString,
  getVersioningStatus,
  listObjects,
  putJsonObject,
  putLifecycleExpirationRule,
  putObject,
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

    await expect(getObjectAsString(bucket, "users/1/profile.json")).resolves.toContain("Ada");

    const objects = await listObjects(bucket, "users/");
    expect(objects.map((object) => object.key)).toEqual(["users/1/profile.json"]);
  });

  it("stores and reads typed JSON documents", async () => {
    await putJsonObject({ bucket, key: "users/2/profile.json", value: { id: "2", name: "Grace" } });

    await expect(getJsonObject<{ id: string; name: string }>(bucket, "users/2/profile.json")).resolves.toEqual({
      id: "2",
      name: "Grace",
    });
  });

  it("enables versioning", async () => {
    await enableVersioning(bucket);
    await expect(getVersioningStatus(bucket)).resolves.toBe("Enabled");
  });

  it("stores lifecycle expiration rules", async () => {
    await putLifecycleExpirationRule({ bucket, id: "expire-tmp", prefix: "tmp/", days: 3 });
    await expect(getLifecycleRuleIds(bucket)).resolves.toContain("expire-tmp");
  });

  it("creates presigned urls for uploads and downloads", async () => {
    const putUrl = await createPresignedPutUrl(bucket, "uploads/from-browser.txt", 60);
    const getUrl = await createPresignedGetUrl(bucket, "users/1/profile.json", 60);
    const session = await createBrowserUploadSession(bucket, "uploads/avatar.png", 60);

    expect(putUrl).toContain(bucket);
    expect(putUrl).toContain("X-Amz-Signature");
    expect(getUrl).toContain(bucket);
    expect(getUrl).toContain("X-Amz-Signature");
    expect(session.requiredHeaders["content-type"]).toBe("application/octet-stream");
    expect(session.putUrl).toContain("X-Amz-Signature");
  });

  it("wraps SDK write failures in S3Error", async () => {
    await expect(putObject({ bucket, key: "x", body: "x" }, failingClient("AccessDenied"))).rejects.toMatchObject({
      code: "S3_AccessDenied",
      message: "S3 putObject failed",
    } satisfies Partial<S3Error>);
  });

  it("wraps SDK read failures in S3Error", async () => {
    await expect(listObjects(bucket, "", failingClient("NoSuchBucket"))).rejects.toMatchObject({
      code: "S3_NoSuchBucket",
      message: "S3 listObjects failed",
    } satisfies Partial<S3Error>);
  });
});
