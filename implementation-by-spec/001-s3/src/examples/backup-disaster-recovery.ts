#!/usr/bin/env tsx
import {
  createBucket,
  deleteBucket,
  enableVersioning,
  getVersioningStatus,
  putJsonObject,
  writeBackupManifest,
} from "../use-cases/object-storage.js";

const bucket = `floci-s3-dr-${Date.now()}`;
await createBucket(bucket);
await enableVersioning(bucket);

await putJsonObject({
  bucket,
  key: "tenants/acme/critical/customer-001.json",
  value: { customerId: "customer-001", tier: "enterprise" },
});
await putJsonObject({
  bucket,
  key: "tenants/acme/critical/customer-002.json",
  value: { customerId: "customer-002", tier: "enterprise" },
});

const manifest = await writeBackupManifest(bucket, "tenants/acme/critical/");

console.log({
  versioning: await getVersioningStatus(bucket),
  manifest,
  productionNextStep:
    "replicate bucket cross-region and test restore from manifest during DR drills",
});

await deleteBucket(bucket);
