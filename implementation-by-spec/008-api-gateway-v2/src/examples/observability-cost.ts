#!/usr/bin/env tsx
import {
  corsHeaders,
  estimateHttpApiCost,
  secureHttpResponse,
} from "../use-cases/http-api.js";

console.log({
  cors: corsHeaders("https://console.example.com"),
  healthResponse: secureHttpResponse(
    200,
    { status: "ok" },
    "https://console.example.com",
  ),
  monthlyCostEstimate: estimateHttpApiCost({ requests: 100_000_000 }),
  monitoring: [
    "4XXError",
    "5XXError",
    "Latency",
    "IntegrationLatency",
    "Count",
    "JWT authorizer errors",
  ],
  costOptimization:
    "HTTP APIs are cheaper than REST APIs; use route-level metrics selectively and cache/CloudFront for public read-heavy paths",
});
