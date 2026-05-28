#!/usr/bin/env tsx
import { createBasicHttpApi } from "../src/use-cases/http-api.js";
export const apiName = process.env.HTTP_API_NAME ?? "floci-http-api-lab";
const api = await createBasicHttpApi(apiName);
console.log(`Setup API Gateway v2 HTTP API ${api.apiId}`);
