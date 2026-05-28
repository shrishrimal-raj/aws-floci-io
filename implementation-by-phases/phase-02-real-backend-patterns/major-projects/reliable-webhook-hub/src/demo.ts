#!/usr/bin/env tsx
import { computeBackoffMs, signWebhook } from "../../../src/index.js";

const body = JSON.stringify({ type: "invoice.paid", id: "evt_demo" });
console.log("Reliable Webhook Hub demo");
console.log(`signature: ${signWebhook("demo-secret", body, 1234567890)}`);
console.log(`attempt 1 backoff: ${computeBackoffMs(1, undefined, () => 0)}ms`);
console.log(`attempt 5 backoff: ${computeBackoffMs(5, undefined, () => 0)}ms`);
console.log("Features: HMAC signing, retry/DLQ classification, idempotency TTL, SES mailers, token-bucket limits.");
