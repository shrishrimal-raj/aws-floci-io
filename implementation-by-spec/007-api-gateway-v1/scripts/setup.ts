#!/usr/bin/env tsx
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { createMockRestApi } from "../src/use-cases/rest-api.js";

export const apiName = process.env.REST_API_NAME ?? "floci-rest-api-lab";
export const stateFile = join(process.cwd(), ".floci-rest-api.json");

const api = await createMockRestApi(apiName);
await mkdir(dirname(stateFile), { recursive: true });
await writeFile(stateFile, JSON.stringify({ ...api, apiName, createdAt: new Date().toISOString() }, null, 2));

console.log(`Setup API Gateway v1 REST API ${api.restApiId}`);
console.log(`Invoke URL: ${api.invokeUrl}`);
console.log(`State file: ${stateFile}`);
