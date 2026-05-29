#!/usr/bin/env tsx
import { httpErrorResponse, httpResponse } from "../use-cases/http-api.js";

console.log(httpResponse(200, { ok: true }));
console.log(httpErrorResponse(401, "Unauthorized"));
