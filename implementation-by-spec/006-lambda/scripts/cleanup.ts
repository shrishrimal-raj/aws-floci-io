#!/usr/bin/env tsx
import { deleteFunction } from "../src/use-cases/functions.js";

const apiFunctionName =
  process.env.LAMBDA_API_FUNCTION_NAME ?? "floci-lambda-api-lab";
const workerFunctionName =
  process.env.LAMBDA_WORKER_FUNCTION_NAME ?? "floci-lambda-worker-lab";
const complianceFunctionName =
  process.env.LAMBDA_COMPLIANCE_FUNCTION_NAME ?? "floci-lambda-compliance-lab";

await deleteFunction(apiFunctionName);
await deleteFunction(workerFunctionName);
await deleteFunction(complianceFunctionName);

console.log(`Cleanup Lambda function ${apiFunctionName}`);
console.log(`Cleanup Lambda function ${workerFunctionName}`);
console.log(`Cleanup Lambda function ${complianceFunctionName}`);
