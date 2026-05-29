#!/usr/bin/env tsx
import {
  buildHttpInvokeUrl,
  createHttpApi,
  createHttpProxyIntegration,
  createRoute,
  createStage,
  deleteHttpApi,
  routeKey,
} from "../use-cases/http-api.js";

const apiId = await createHttpApi(`floci-http-webhook-${Date.now()}`);

try {
  const integrationId = await createHttpProxyIntegration({
    apiId,
    uri: "https://events.internal.example.com/webhooks",
    method: "POST",
  });
  const webhookRoute = routeKey("POST", "/webhooks/stripe");
  const routeId = await createRoute(apiId, webhookRoute, integrationId);
  await createStage(apiId);

  console.log({
    eventDrivenProcessing:
      "HTTP API receives SaaS webhook, validates signature in Lambda/ECS, then publishes EventBridge/SNS event",
    webhookRoute,
    routeId,
    invokeUrl: buildHttpInvokeUrl(apiId, "/webhooks/stripe"),
    productionControls: [
      "WAF",
      "JWT/Lambda authorizer when possible",
      "signature validation",
      "idempotency key",
      "DLQ for async processing",
    ],
  });
} finally {
  await deleteHttpApi(apiId);
}
