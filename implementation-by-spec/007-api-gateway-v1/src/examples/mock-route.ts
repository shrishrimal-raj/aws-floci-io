#!/usr/bin/env tsx
import { createMockRestApi, deleteRestApi } from "../use-cases/rest-api.js";

const api = await createMockRestApi(`floci-rest-route-${Date.now()}`);
try {
  console.log({ restApiId: api.restApiId, stageName: api.stageName, invokeUrl: api.invokeUrl });
} finally {
  await deleteRestApi(api.restApiId);
}
