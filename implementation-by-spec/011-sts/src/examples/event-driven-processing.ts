#!/usr/bin/env tsx
import { createStsAuditEvent, createStsRetryPlan, planCredentialRefresh, summarizeCredentials } from "../use-cases/credentials.js";

const simulatedWorkerCredentials = {
  AccessKeyId: "ASIAEVENTWORKER",
  SecretAccessKey: "never-log-this",
  SessionToken: "never-log-this-either",
  Expiration: new Date(Date.now() + 45 * 60_000),
};

console.log({
  useCase: "EventBridge to Lambda worker credential health",
  eventSource: "orders.events.payment_authorized",
  credentialSummary: summarizeCredentials(simulatedWorkerCredentials, 10 * 60_000),
  refreshPlan: planCredentialRefresh(simulatedWorkerCredentials, { refreshBeforeMs: 10 * 60_000, requiredWorkloadTtlMs: 20 * 60_000 }),
  retry: createStsRetryPlan("fast"),
  audit: createStsAuditEvent({
    operation: "ProcessEventWithTemporaryCredentials",
    actor: "orders-event-worker",
    outcome: "ALLOW",
    reason: "Worker credentials have enough TTL to process event batch and retry safely",
    traceId: "evt-9001",
  }),
});
