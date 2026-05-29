#!/usr/bin/env tsx
import {
  createQueue,
  deleteQueue,
  getQueueArn,
  getQueueUrl,
  parseJsonEnvelope,
  processOneMessage,
  sendJsonMessage,
} from "../use-cases/queues.js";

interface TenantExportRequested {
  tenantId: string;
  actorId: string;
  exportId: string;
  s3Prefix: string;
}

const queueName = `floci-sqs-tenant-export-${Date.now()}`;
const queueUrl = await createQueue({
  name: queueName,
  receiveWaitTimeSeconds: 10,
  visibilityTimeoutSeconds: 30,
});
const resolvedUrl = await getQueueUrl(queueName);
const queueArn = await getQueueArn(queueUrl);

await sendJsonMessage<TenantExportRequested>(
  queueUrl,
  "tenant-export.requested",
  {
    tenantId: "acme-health",
    actorId: "user-456",
    exportId: "exp-9001",
    s3Prefix: "tenants/acme-health/exports/exp-9001/",
  },
  "trace-export-9001",
);

await processOneMessage(queueUrl, async (message) => {
  const envelope = parseJsonEnvelope<TenantExportRequested>(message.body);
  if (
    !envelope.payload.s3Prefix.startsWith(
      `tenants/${envelope.payload.tenantId}/`,
    )
  ) {
    throw new Error("tenant prefix mismatch");
  }

  console.log({
    queueArn,
    resolvedUrlMatches: resolvedUrl === queueUrl,
    secureAccessPattern:
      "worker validates tenant prefix before creating S3 export",
    event: envelope,
  });
});

await deleteQueue(queueUrl);
