#!/usr/bin/env tsx
import { createFunction } from "../src/use-cases/functions.js";
export const functionName = process.env.LAMBDA_FUNCTION_NAME ?? "floci-lambda-lab";
await createFunction({ name:functionName, environment:{ NODE_ENV:"test" } });
console.log(`Setup Lambda function ${functionName}`);
