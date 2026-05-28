import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { client } from "../src/client.js";
import {
  createBucket,
  createPresignedGetUrl,
  createPresignedPutUrl,
  deleteBucket,
  enableVersioning,
  getLifecycleRuleIds,
  getObjectAsString,
  getVersioningStatus,
  listObjects,
  putLifecycleExpirationRule,
  putObject,
} from "../src/use-cases/object-storage.js";
import { waitForFloci } from "@floci-lab/test-utils";

const bucket = `floci-s3-test-${Date.now()}`;

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

    expect(putUrl).toContain(bucket);
    expect(putUrl).toContain("X-Amz-Signature");
    expect(getUrl).toContain(bucket);
    expect(getUrl).toContain("X-Amz-Signature");
  });
});
