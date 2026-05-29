#!/usr/bin/env tsx
import {
  createIamAuditEvent,
  multiStatementPolicy,
  validatePolicyDocument,
} from "../use-cases/access.js";

const riskyDocument = multiStatementPolicy([
  { actions: ["s3:*"], resources: ["*"] },
  {
    actions: ["iam:PassRole"],
    resources: ["arn:aws:iam::000000000000:role/orders-lambda"],
  },
]);

const findings = validatePolicyDocument(riskyDocument);

console.log({
  complianceUseCase:
    "access review detects wildcard risks before policy reaches production",
  findings,
  audit: createIamAuditEvent({
    action: "QuarterlyAccessReview",
    principal: "security-reviewer",
    resource: "orders-service-policy",
    outcome: findings.length ? "REVIEW" : "ALLOW",
    reason: findings.map((finding) => finding.message).join("; "),
    ticketId: "GRC-2026-Q2",
  }),
});
