#!/usr/bin/env tsx
import {
  createBucket,
  createPresignedPutUrl,
  createPresignedPutUrlForObject,
  deleteBucket,
  deleteObject,
  emptyBucket,
  listObjects,
  putObject,
} from "../use-cases/object-storage.js";

const bucket = `floci-s3-ops-${Date.now()}`;

function metric(
  name: string,
  value: number,
  dimensions: Record<string, string>,
) {
  return {
    namespace: "EnterpriseStorage",
    name,
    value,
    unit: "Count",
    dimensions,
  };
}

function audit(action: string, key: string, outcome: "ALLOW" | "ERROR") {
  return {
    timestamp: new Date().toISOString(),
    service: "document-api",
    tenantId: "acme-retail",
    action,
    bucket,
    key,
    outcome,
  };
}

await createBucket(bucket);

await putObject({
  bucket,
  key: "tenants/acme-retail/imports/catalog.csv",
  body: "sku,name\nsku-1,Trail Shoes\n",
  contentType: "text/csv",
  metadata: { tenantId: "acme-retail", source: "vendor-sftp" },
});

const rawPutUrl = await createPresignedPutUrl(
  bucket,
  "tenants/acme-retail/tmp/raw-upload.bin",
  120,
);
const signedMetadataPutUrl = await createPresignedPutUrlForObject(
  {
    bucket,
    key: "tenants/acme-retail/imports/signed-catalog.csv",
    contentType: "text/csv",
    metadata: { tenantId: "acme-retail", ingestion: "catalog" },
  },
  120,
);

console.log({
  useCase:
    "operations team traces upload, emits metrics, and cleans temporary objects",
  urls: {
    rawPutUrlHasSignature: rawPutUrl.includes("X-Amz-Signature"),
    signedMetadataPutUrlHasSignature:
      signedMetadataPutUrl.includes("X-Amz-Signature"),
  },
  log: audit(
    "CatalogUploaded",
    "tenants/acme-retail/imports/catalog.csv",
    "ALLOW",
  ),
  metric: metric("CatalogUploadAccepted", 1, {
    tenantId: "acme-retail",
    env: "local",
  }),
  objectsBeforeDelete: await listObjects(bucket, "tenants/acme-retail/"),
});

await deleteObject(bucket, "tenants/acme-retail/imports/catalog.csv");
console.log({
  objectsAfterSingleDelete: await listObjects(bucket, "tenants/acme-retail/"),
});

await emptyBucket(bucket);
await deleteBucket(bucket);
