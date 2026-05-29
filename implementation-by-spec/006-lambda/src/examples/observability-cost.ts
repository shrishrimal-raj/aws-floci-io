#!/usr/bin/env tsx
import {
  createLambdaAuditEvent,
  estimateLambdaCost,
  serviceFunctionSpec,
} from "../use-cases/functions.js";

const spec = serviceFunctionSpec(
  "payments-api",
  { POWERTOOLS_SERVICE_NAME: "payments-api", LOG_LEVEL: "info" },
  { timeoutSeconds: 10, memoryMb: 512 },
);

const cost = estimateLambdaCost({
  requests: 5_000_000,
  durationMs: 120,
  memoryMb: 512,
});

console.log({
  spec,
  audit: createLambdaAuditEvent({
    functionName: spec.name,
    action: "PaymentAuthorized",
    outcome: "SUCCESS",
    requestId: "req-123",
    tenantId: "acme-retail",
    traceId: "trace-123",
  }),
  cost,
  monitoring: [
    "Errors",
    "Duration",
    "Throttles",
    "ConcurrentExecutions",
    "IteratorAge",
    "DLQ depth",
  ],
  costOptimization:
    "right-size memory, reduce cold starts, batch event sources, and avoid chatty downstream calls",
});
