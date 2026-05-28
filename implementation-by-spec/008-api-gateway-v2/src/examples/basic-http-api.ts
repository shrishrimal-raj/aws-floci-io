#!/usr/bin/env tsx
import { createBasicHttpApi, deleteHttpApi } from "../use-cases/http-api.js";
const api = await createBasicHttpApi(`floci-http-example-${Date.now()}`);
console.log(api);
await deleteHttpApi(api.apiId);
