#!/usr/bin/env tsx
import { buildInvokeUrl } from "../use-cases/rest-api.js";

console.log(buildInvokeUrl("abc123", "dev", "/health"));
console.log(buildInvokeUrl("abc123", "prod", "orders"));
