#!/usr/bin/env tsx
import {
  buildScopedSessionPolicy,
  createExternalId,
  createStsAuditEvent,
  validateRoleSessionName,
} from "../use-cases/credentials.js";

const sessionName = validateRoleSessionName("grc-q2-reviewer");
const externalId = createExternalId("regulated-bank", "quarterly-access-review");
const readOnlyEvidencePolicy = buildScopedSessionPolicy([
  {
    effect: "Allow",
    actions: ["cloudtrail:LookupEvents", "logs:StartQuery", "logs:GetQueryResults", "s3:GetObject"],
    resources: ["*"],
  },
]);

console.log({
  useCase: "Compliance-oriented temporary auditor access",
  sessionName,
  externalId,
  sessionPolicy: JSON.parse(readOnlyEvidencePolicy),
  audit: createStsAuditEvent({
    operation: "AssumeRole",
    actor: "security-auditor",
    targetArn: "arn:aws:iam::111122223333:role/security-readonly-audit",
    sessionName,
    outcome: "ALLOW",
    ticketId: "GRC-2026-Q2",
    reason: "Read-only evidence collection for quarterly access review",
  }),
});
