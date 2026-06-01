#!/usr/bin/env tsx
import {
  createBucket,
  deleteBucket,
  estimateMonthlyStorageCost,
  listObjects,
  putJsonObject,
  putObjectWithRetry,
  s3Uri,
  writeAuditLogEntry,
} from "../use-cases/object-storage.js";

/**
 * AWS Service Integration Blueprint
 *
 * Real-world pattern: S3 is not isolated. Object writes become integration events
 * for EventBridge, Lambda, SQS, Step Functions, Glue/Athena, and monitoring.
 * This local example stores integration payloads in S3 so learners can inspect the
 * exact contract before wiring real AWS targets.
 */

interface IngestionEvent {
  source: "enterprise.s3.ingestion";
  detailType: "ObjectReadyForProcessing";
  detail: {
    tenantId: string;
    objectUri: string;
    workflow: "virus-scan" | "transcode" | "catalog-index";
    traceId: string;
  };
}

const landingBucket = `floci-s3-integration-landing-${Date.now()}`;
const auditBucket = `floci-s3-integration-audit-${Date.now()}`;
const tenantId = "acme-media";
const traceId = `trace-${Date.now()}`;
const sourceKey = `tenants/${tenantId}/landing/videos/campaign-launch.mp4`;

function eventBridgeEnvelope(objectUri: string): IngestionEvent {
  return {
    source: "enterprise.s3.ingestion",
    detailType: "ObjectReadyForProcessing",
    detail: {
      tenantId,
      objectUri,
      workflow: "transcode",
      traceId,
    },
  };
}

function lambdaWorkItem(event: IngestionEvent) {
  return {
    handler: "transcode-worker.handler",
    input: event.detail,
    idempotencyKey: `${event.detail.tenantId}:${event.detail.objectUri}`,
    retryPolicy: { maxAttempts: 3, backoffRate: 2 },
  };
}

function cloudWatchMetric(name: string, value: number) {
  return {
    namespace: "EnterpriseS3Ingestion",
    metricName: name,
    value,
    unit: "Count",
    dimensions: { tenantId, workflow: "transcode" },
    traceId,
  };
}

await createBucket(landingBucket);
await createBucket(auditBucket);

// Function focus: retry wrapper. Use for transient S3 failures during ingestion.
await putObjectWithRetry(
  {
    bucket: landingBucket,
    key: sourceKey,
    body: "SIMULATED_VIDEO_BYTES",
    contentType: "video/mp4",
    metadata: {
      tenantId,
      classification: "internal",
      traceId,
      workflow: "transcode",
    },
  },
  { attempts: 3, baseDelayMs: 50 },
);

const objectUri = s3Uri(landingBucket, sourceKey);
const event = eventBridgeEnvelope(objectUri);
const workItem = lambdaWorkItem(event);
const acceptedMetric = cloudWatchMetric("ObjectAccepted", 1);

// Function focus: JSON documents. Store contracts that other AWS services consume.
await putJsonObject({
  bucket: landingBucket,
  key: `integrations/eventbridge/${traceId}.json`,
  value: event,
  metadata: { tenantId, target: "eventbridge" },
});

await putJsonObject({
  bucket: landingBucket,
  key: `integrations/lambda-work/${traceId}.json`,
  value: workItem,
  metadata: { tenantId, target: "lambda" },
});

await putJsonObject({
  bucket: landingBucket,
  key: `observability/metrics/${traceId}.json`,
  value: acceptedMetric,
  metadata: { tenantId, target: "cloudwatch" },
});

await writeAuditLogEntry(auditBucket, {
  eventId: `evt-${Date.now()}-object-accepted`,
  timestamp: new Date().toISOString(),
  tenantId,
  actorId: "media-api",
  action: "ObjectAcceptedForProcessing",
  bucket: landingBucket,
  key: sourceKey,
  outcome: "ALLOW",
  requestId: traceId,
});

const cost = estimateMonthlyStorageCost({
  storageGb: 500,
  putRequests: 1_200_000,
  getRequests: 4_000_000,
});

console.log({
  useCase: "S3 object ingestion integrated with EventBridge, Lambda, and monitoring",
  objectUri,
  eventBridgeContract: event,
  lambdaWorkItem: workItem,
  metric: acceptedMetric,
  integrationObjects: await listObjects(landingBucket, "integrations/"),
  auditObjects: await listObjects(auditBucket, `audit/tenant=${tenantId}/`),
  monthlyCostEstimateUsd: cost.totalUsd,
  productionMapping: [
    "S3 Event Notification or EventBridge rule starts processing",
    "Lambda validates metadata and writes idempotency state to DynamoDB",
    "SQS/DLQ buffers retries when downstream MediaConvert or AV scanner fails",
    "Step Functions coordinates long-running transcode or approval workflows",
    "CloudWatch dashboards and alarms track accepted, failed, retried objects",
  ],
});

await deleteBucket(landingBucket);
await deleteBucket(auditBucket);
