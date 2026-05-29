#!/usr/bin/env tsx
import { buildHttpInvokeUrl } from "../use-cases/http-api.js";

console.log(buildHttpInvokeUrl("abc123", "/health"));
console.log(buildHttpInvokeUrl("abc123", "orders"));
