#!/usr/bin/env tsx
import {
  createFunction,
  deleteFunction,
  invokeJsonWithRetry,
  serviceFunctionSpec,
  updateFunctionCode,
} from "../use-cases/functions.js";

const name = `floci-lambda-orders-worker-${Date.now()}`;

await createFunction(
  serviceFunctionSpec(
    name,
    { ORDERS_TABLE: "orders", EVENT_BUS: "orders-bus" },
    { timeoutSeconds: 30, memoryMb: 512 },
  ),
);

try {
  await updateFunctionCode(name);
  const result = await invokeJsonWithRetry(
    name,
    { type: "OrderPaid", tenantId: "acme-retail", orderId: "ord-1001" },
    { attempts: 3, baseDelayMs: 50 },
  );

  console.log({
    useCase:
      "SQS/EventBridge worker updates DynamoDB, publishes SNS event, and retries transient Lambda platform throttles",
    result,
  });
} finally {
  await deleteFunction(name);
}
