#!/usr/bin/env tsx
import { deleteFunction } from "../src/use-cases/functions.js";
const functionName = process.env.LAMBDA_FUNCTION_NAME ?? "floci-lambda-lab";
await deleteFunction(functionName);
console.log(`Cleanup Lambda function ${functionName}`);
