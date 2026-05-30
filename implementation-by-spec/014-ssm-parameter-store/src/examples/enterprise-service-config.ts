#!/usr/bin/env tsx
import {
  buildParameterAuditLog,
  loadServiceRuntimeConfig,
  parameterCostOptimizationPlan,
  parameterPathReadPolicy,
  seedServiceRuntimeConfig,
  withParameterStoreRetry,
} from "../index.js";

const serviceConfig = {
  serviceName: "orders-api",
  environment: "dev",
  databaseUrl: "postgres://orders.local:5432/orders",
  featureFlags: { checkoutV2: true, fraudReview: false },
  apiTimeoutMs: 2500,
};

await withParameterStoreRetry(() => seedServiceRuntimeConfig(serviceConfig), {
  maxAttempts: 3,
  baseDelayMs: 100,
  backoffRate: 2,
  retryableErrors: ["ThrottlingException", "InternalServerError"],
});

const loaded = await loadServiceRuntimeConfig("orders-api", "dev");

console.log(
  JSON.stringify(
    {
      loaded,
      leastPrivilegePolicy: parameterPathReadPolicy("/orders-api/dev", "us-east-1", "123456789012", "orders-api"),
      audit: buildParameterAuditLog({
        eventId: "evt-orders-config-read",
        actor: "orders-api-task-role",
        action: "GetParametersByPath",
        parameterName: "/orders-api/dev/*",
        outcome: "ALLOW",
        metadata: { source: "ecs-startup" },
      }),
      cost: parameterCostOptimizationPlan("/orders-api/dev", 2500),
    },
    null,
    2
  )
);
