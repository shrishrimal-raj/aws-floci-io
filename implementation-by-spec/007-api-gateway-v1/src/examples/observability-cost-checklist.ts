#!/usr/bin/env tsx
import { buildInvokeUrl } from "../use-cases/rest-api.js";

const restApiId = process.env.REST_API_ID ?? "abc123";
const stageName = process.env.STAGE_NAME ?? "prod";

console.log({
  scenario: "production observability and cost checklist",
  sampleEndpoints: {
    health: buildInvokeUrl(restApiId, stageName, "/health"),
    orders: buildInvokeUrl(restApiId, stageName, "/orders"),
    audit: buildInvokeUrl(restApiId, stageName, "/audit"),
  },
  alarms: [
    { metric: "5XXError", threshold: "> 1% for 5 minutes", action: "page service owner" },
    { metric: "4XXError", threshold: "sudden spike", action: "check auth, WAF, and client deploys" },
    { metric: "Latency", threshold: "p95 above SLO", action: "inspect integration latency and throttles" },
    { metric: "Count", threshold: "unexpected traffic surge", action: "verify usage plan and cost anomaly" },
  ],
  logs: {
    accessLogFields: ["requestId", "ip", "caller", "user", "requestTime", "httpMethod", "resourcePath", "status", "latency"],
    retention: "Set per environment: short for dev, longer for regulated prod evidence.",
    privacy: "Do not log secrets, full tokens, or sensitive payloads.",
  },
  costControls: [
    "Use stage/method throttling and usage plans for external consumers.",
    "Delete ephemeral APIs in tests and examples with finally blocks.",
    "Review REST API v1 vs HTTP API v2 feature need before production launch.",
    "Monitor per-stage request volume and cache only when hit ratio offsets cache cost.",
  ],
});
