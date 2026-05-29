#!/usr/bin/env tsx
import { handlerErrorResponse, handlerResponse } from "../use-cases/functions.js";

console.log(handlerResponse(200, { ok: true, id: "req-1" }));
console.log(handlerErrorResponse(404, "Not found"));
