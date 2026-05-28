#!/usr/bin/env tsx
import { createMockRestApi, deleteRestApi } from "../use-cases/rest-api.js";
const api = await createMockRestApi(`floci-rest-example-${Date.now()}`);
console.log(api);
await deleteRestApi(api.restApiId);
