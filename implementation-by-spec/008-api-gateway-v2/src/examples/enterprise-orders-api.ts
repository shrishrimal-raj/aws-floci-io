#!/usr/bin/env tsx
import {
  buildHttpInvokeUrl,
  createApiAuditEvent,
  createHttpApi,
  createHttpProxyIntegration,
  createRoutes,
  createStage,
  deleteHttpApi,
  estimateHttpApiCost,
} from "../use-cases/http-api.js";

const apiId = await createHttpApi(`floci-http-orders-${Date.now()}`);

try {
  const integrationId = await createHttpProxyIntegration({
    apiId,
    uri: "https://orders.internal.example.com",
    method: "ANY",
  });

  const routeIds = await createRoutes(
    apiId,
    [
      { method: "POST", path: "/orders" },
      { method: "GET", path: "/orders/{orderId}" },
      { method: "PATCH", path: "/orders/{orderId}" },
    ],
    integrationId,
  );
  const stageName = await createStage(apiId, "$default");

  console.log({
    secureAccessPattern:
      "HTTP API fronts private order service; add JWT authorizer and Lambda permissions in real AWS",
    apiId,
    integrationId,
    routeIds,
    stageName,
    invokeUrl: buildHttpInvokeUrl(apiId, "/orders"),
    audit: createApiAuditEvent({
      apiId,
      routeKey: "POST /orders",
      action: "CreateOrderRouteProvisioned",
      outcome: "ALLOW",
      tenantId: "platform",
    }),
    monthlyCostEstimate: estimateHttpApiCost({ requests: 25_000_000 }),
  });
} finally {
  await deleteHttpApi(apiId);
}
