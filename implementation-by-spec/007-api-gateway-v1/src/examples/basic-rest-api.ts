#!/usr/bin/env tsx
import { createMockRestApi, deleteRestApi } from "../use-cases/rest-api.js";

const api = await createMockRestApi(`floci-rest-example-${Date.now()}`);
try {
  console.log({
    scenario: "minimal health-check REST API",
    restApiId: api.restApiId,
    stageName: api.stageName,
    invokeUrl: api.invokeUrl,
  });
} finally {
  await deleteRestApi(api.restApiId);
}
