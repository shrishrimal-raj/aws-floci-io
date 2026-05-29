#!/usr/bin/env tsx
import {
  createApiAuditEvent,
  httpErrorResponse,
  routeKey,
  secureHttpResponse,
} from "../use-cases/http-api.js";

const route = routeKey("post", "payments/authorize");

console.log({
  route,
  success: secureHttpResponse(
    202,
    { accepted: true, paymentId: "pay-1001" },
    "https://app.example.com",
  ),
  denied: httpErrorResponse(403, "Forbidden"),
  audit: createApiAuditEvent({
    apiId: "api-local",
    routeKey: route,
    action: "AuthorizePayment",
    outcome: "DENY",
    requestId: "req-1001",
    tenantId: "acme-retail",
    traceId: "trace-1001",
    reason: "missing scope payments:write",
  }),
});
