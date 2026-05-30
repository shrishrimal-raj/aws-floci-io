#!/usr/bin/env tsx
import { enterpriseApplicationLog, jsonFilterPattern, structuredLog } from "../index.js";

const requestLog = structuredLog("INFO", "order.created", {
  service: "orders-api",
  environment: "dev",
  tenantId: "tenant-a",
  correlationId: "corr-1001",
  orderId: "order-1001",
  totalCents: 4200,
});

const secureLog = enterpriseApplicationLog("WARN", "payment.retry", {
  service: "payments-api",
  tenantId: "tenant-a",
  correlationId: "corr-1001",
  token: "secret-token",
  retryAttempt: 2,
});

console.log(JSON.stringify({ requestLog, secureLog, errorFilter: jsonFilterPattern({ tenantId: "tenant-a", level: "ERROR" }) }, null, 2));
