#!/usr/bin/env tsx
import {
  createFunction,
  deleteFunction,
  invokeEvent,
  serviceFunctionSpec,
} from "../use-cases/functions.js";

const name = `floci-lambda-event-pipeline-${Date.now()}`;

await createFunction(
  serviceFunctionSpec(
    name,
    { PIPELINE: "document-processing", OUTPUT_BUCKET: "processed-documents" },
    { timeoutSeconds: 60, memoryMb: 1024 },
  ),
);

try {
  const accepted = await invokeEvent(name, {
    source: "aws.s3",
    detailType: "ObjectCreated",
    detail: {
      bucket: "incoming-documents",
      key: "tenants/acme/forms/w9.pdf",
      tenantId: "acme",
    },
  });

  console.log({
    eventDrivenPattern:
      "S3/EventBridge async invoke starts document processing; failures should go to DLQ/destination in real AWS",
    accepted,
  });
} finally {
  await deleteFunction(name);
}
