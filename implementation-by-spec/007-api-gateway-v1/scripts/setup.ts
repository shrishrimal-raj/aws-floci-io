#!/usr/bin/env tsx
import { createMockRestApi } from "../src/use-cases/rest-api.js";
export const apiName = process.env.REST_API_NAME ?? "floci-rest-api-lab";
const api = await createMockRestApi(apiName);
console.log(`Setup API Gateway v1 REST API ${api.restApiId}`);
