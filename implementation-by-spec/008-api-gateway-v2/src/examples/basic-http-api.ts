#!/usr/bin/env tsx
import {
  createBasicHttpApi,
  createMockIntegration,
  deleteHttpApi,
} from "../use-cases/http-api.js";
const api = await createBasicHttpApi(`floci-http-example-${Date.now()}`);
const extraIntegrationId = await createMockIntegration(api.apiId);
console.log({ ...api, extraIntegrationId });
await deleteHttpApi(api.apiId);
