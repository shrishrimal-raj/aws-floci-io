#!/usr/bin/env tsx
import {
  createFunctionIfMissing,
  serviceFunctionSpec,
} from "../src/use-cases/functions.js";

export const apiFunctionName =
  process.env.LAMBDA_API_FUNCTION_NAME ?? "floci-lambda-api-lab";
export const workerFunctionName =
  process.env.LAMBDA_WORKER_FUNCTION_NAME ?? "floci-lambda-worker-lab";
export const complianceFunctionName =
  process.env.LAMBDA_COMPLIANCE_FUNCTION_NAME ?? "floci-lambda-compliance-lab";

await createFunctionIfMissing(
  serviceFunctionSpec(
    apiFunctionName,
    { SERVICE_NAME: "orders-api", NODE_ENV: "test" },
    { timeoutSeconds: 8, memoryMb: 256 },
  ),
);

await createFunctionIfMissing(
  serviceFunctionSpec(
    workerFunctionName,
    { SERVICE_NAME: "orders-worker", ORDERS_TABLE: "orders" },
    { timeoutSeconds: 30, memoryMb: 512 },
  ),
);

await createFunctionIfMissing(
  serviceFunctionSpec(
    complianceFunctionName,
    {
      SERVICE_NAME: "compliance-maintenance",
      AUDIT_BUCKET: "compliance-audit",
      CONFIG_RULE: "required-tags",
    },
    { timeoutSeconds: 120, memoryMb: 256 },
  ),
);

console.log(`Setup Lambda function ${apiFunctionName}`);
console.log(`Setup Lambda function ${workerFunctionName}`);
console.log(`Setup Lambda function ${complianceFunctionName}`);
