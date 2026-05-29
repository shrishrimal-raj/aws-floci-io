#!/usr/bin/env tsx
import {
  createLambdaAuditEvent,
  handlerErrorResponse,
  parseApiJsonBody,
  requestContext,
  secureJsonResponse,
  type ApiGatewayEventLike,
} from "../use-cases/functions.js";

interface CreateOrderRequest {
  orderId: string;
  totalCents: number;
}

async function handler(event: ApiGatewayEventLike) {
  try {
    const context = requestContext(event);
    const body = parseApiJsonBody<CreateOrderRequest>(event);
    if (!context.tenantId)
      return handlerErrorResponse(403, "Missing tenant claim");

    console.log(
      createLambdaAuditEvent({
        functionName: "orders-api",
        action: "CreateOrder",
        outcome: "SUCCESS",
        requestId: context.requestId,
        tenantId: context.tenantId,
        traceId: context.traceId,
      }),
    );

    return secureJsonResponse(
      202,
      { accepted: true, tenantId: context.tenantId, orderId: body.orderId },
      "https://app.example.com",
    );
  } catch {
    return handlerErrorResponse(400, "Invalid request");
  }
}

console.log(
  await handler({
    body: JSON.stringify({ orderId: "ord-1001", totalCents: 12999 }),
    headers: { "x-correlation-id": "trace-1001" },
    requestContext: {
      requestId: "req-1001",
      authorizer: { claims: { tenantId: "acme-retail" } },
    },
  }),
);
