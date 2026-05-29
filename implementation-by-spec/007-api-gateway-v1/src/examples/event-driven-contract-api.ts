#!/usr/bin/env tsx
import {
  buildInvokeUrl,
  createJsonModel,
  createMockRoutes,
  deployStage,
  retryControlPlane,
  rootResourceId,
  withRestApiLifecycle,
} from "../use-cases/rest-api.js";

const stageName = "dev";

await withRestApiLifecycle(`floci-events-contract-${Date.now()}`, async ({ restApiId }) => {
  const rootId = await rootResourceId(restApiId);
  if (!rootId) throw new Error("root resource missing");

  const routes = await createMockRoutes([
    {
      restApiId,
      parentId: rootId,
      pathPart: "events",
      method: "POST",
      description: "webhook ingress for partner events before EventBridge/SQS fan-out is wired",
    },
    {
      restApiId,
      parentId: rootId,
      pathPart: "replay",
      method: "POST",
      description: "controlled replay endpoint for failed event recovery",
    },
    {
      restApiId,
      parentId: rootId,
      pathPart: "status",
      method: "GET",
      description: "event pipeline health and last-processed checkpoint visibility",
    },
  ]);

  const modelId = await createJsonModel(restApiId, "PartnerEventEnvelope");
  await retryControlPlane(() => deployStage(restApiId, stageName));

  console.log({
    scenario: "event-driven partner ingress contract",
    restApiId,
    modelId,
    endpoints: routes.map((route) => ({
      method: route.method,
      description: route.description,
      invokeUrl: buildInvokeUrl(restApiId, stageName, `/${route.pathPart}`),
    })),
    eventDrivenProductionPattern: [
      "API Gateway receives signed partner webhook.",
      "Lambda validates signature, schema, idempotency key, and tenant entitlement.",
      "EventBridge routes valid events to order, billing, and notification services.",
      "SQS dead-letter queues retain poison events for replay through /replay.",
    ],
    retriesAndErrors: {
      clientRetry: "Use exponential backoff for 429 and 5XX responses; do not retry validation 4XX errors.",
      serverRetry: "Use DLQ plus replay endpoint, not infinite synchronous retries.",
      idempotency: "Store partnerEventId to prevent duplicate processing during retry storms.",
    },
    dataLifecycle: {
      hot: "CloudWatch Logs for near-real-time debugging.",
      warm: "S3 event archive partitioned by tenant/date for replay.",
      retention: "Expire raw payloads based on data classification and compliance policy.",
    },
  });
});
