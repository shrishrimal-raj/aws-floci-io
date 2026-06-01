#!/usr/bin/env tsx
import {
  createFunction,
  deleteFunction,
  invokeAndAudit,
  invokeEvent,
  serviceFunctionSpec,
} from "../use-cases/functions.js";

const apiFunctionName = `floci-lambda-api-integration-${Date.now()}`;
const workerFunctionName = `floci-lambda-worker-integration-${Date.now()}`;

await createFunction(
  serviceFunctionSpec(
    apiFunctionName,
    { SERVICE_NAME: "orders-api", EVENT_TARGET: workerFunctionName },
    { timeoutSeconds: 8, memoryMb: 256 },
  ),
);
await createFunction(
  serviceFunctionSpec(
    workerFunctionName,
    { SERVICE_NAME: "orders-worker", ORDERS_TABLE: "orders" },
    { timeoutSeconds: 30, memoryMb: 512 },
  ),
);

try {
  const command = {
    tenantId: "acme-retail",
    orderId: "ord-2001",
    totalCents: 18999,
    traceId: "trace-api-2001",
  };

  const apiCall = await invokeAndAudit(apiFunctionName, command, {
    action: "CreateOrder",
    outcome: "SUCCESS",
    tenantId: command.tenantId,
    traceId: command.traceId,
  });

  const workerAccepted = await invokeEvent(workerFunctionName, {
    source: "aws.apigateway",
    detailType: "OrderCreated",
    detail: command,
  });

  console.log({
    pattern:
      "API Lambda validates request and emits event to async worker Lambda for durable side effects",
    apiCall,
    workerAccepted,
  });
} finally {
  await deleteFunction(apiFunctionName);
  await deleteFunction(workerFunctionName);
}
