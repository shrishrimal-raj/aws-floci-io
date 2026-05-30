#!/usr/bin/env tsx
import {
  assertCredentialsFresh,
  createStsAuditEvent,
  createStsRetryPlan,
  planCredentialRefresh,
  summarizeCredentials,
} from "../use-cases/credentials.js";

const breakGlassCredentials = {
  AccessKeyId: "ASIADRILL",
  SecretAccessKey: "redacted",
  SessionToken: "redacted",
  Expiration: new Date(Date.now() + 2 * 60 * 60_000),
};

assertCredentialsFresh(breakGlassCredentials, 60 * 60_000);

console.log({
  useCase: "Disaster recovery break-glass validation",
  recoveryRegion: "us-west-2",
  credentialSummary: summarizeCredentials(breakGlassCredentials, 60 * 60_000),
  refreshPlan: planCredentialRefresh(breakGlassCredentials, { requiredWorkloadTtlMs: 60 * 60_000 }),
  retry: createStsRetryPlan("conservative"),
  audit: createStsAuditEvent({
    operation: "ValidateBreakGlassSession",
    actor: "incident-commander",
    outcome: "ALLOW",
    ticketId: "INC-DR-2026-05-30",
    reason: "Temporary credentials have enough TTL for regional failover runbook",
  }),
});
