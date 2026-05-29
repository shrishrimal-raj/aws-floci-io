#!/usr/bin/env tsx
import {
  createBucket,
  deleteBucket,
  listObjects,
  putJsonObject,
} from "../use-cases/object-storage.js";

interface ObjectCreatedEvent {
  source: "app.documents";
  detailType: "DocumentUploaded";
  detail: {
    bucket: string;
    key: string;
    tenantId: string;
    workflow: "virus-scan" | "thumbnail" | "metadata-extraction";
  };
}

function objectCreatedEvent(
  bucket: string,
  key: string,
  tenantId: string,
): ObjectCreatedEvent {
  return {
    source: "app.documents",
    detailType: "DocumentUploaded",
    detail: { bucket, key, tenantId, workflow: "metadata-extraction" },
  };
}

const bucket = `floci-s3-event-driven-${Date.now()}`;
await createBucket(bucket);

const key = "tenants/acme/uploads/invoice-001.json";
await putJsonObject({
  bucket,
  key,
  value: { invoiceId: "inv-001", totalCents: 4200 },
  metadata: { tenantId: "acme" },
});

const event = objectCreatedEvent(bucket, key, "acme");
await putJsonObject({
  bucket,
  key: "events/document-uploaded/inv-001.json",
  value: event,
});

console.log({
  event,
  queuedProcessingWork: await listObjects(bucket, "events/"),
  productionNextStep:
    "publish this event to EventBridge, fan out to Lambda/SQS/Step Functions",
});

await deleteBucket(bucket);
