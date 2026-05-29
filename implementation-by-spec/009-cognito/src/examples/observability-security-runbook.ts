#!/usr/bin/env tsx
import { authAuditEvent, buildCognitoIssuerUrl, redactJwtClaims } from "../use-cases/user-pools.js";

const claims = {
  sub: "user-123",
  email: "security@example.com",
  token_use: "access",
  client_id: "web-client",
  iss: buildCognitoIssuerUrl("us-east-1_example"),
  exp: Math.floor(Date.now() / 1000) + 900,
};

console.log({
  scenario: "Cognito observability and security runbook",
  safeClaims: redactJwtClaims(claims),
  sampleAuditEvent: authAuditEvent("auth.claims.accepted", claims, "req-obs-001"),
  monitoring: [
    "Alarm on sudden spikes in SignIn failures, token validation failures, and admin API errors.",
    "Track latency/error rate for authorizer and identity-dependent APIs.",
    "Dashboard active users, failed auth decisions, MFA enrollment, and password reset volume.",
  ],
  securityControls: [
    "Verify JWKS signature, iss, exp, token_use, and client_id/aud on every API request.",
    "Enable MFA/adaptive security in real AWS when risk profile requires it.",
    "Use CloudTrail for admin actions and least-privilege IAM for automation.",
  ],
  eventDrivenProcessing: [
    "Use PostConfirmation trigger to publish user.created events to EventBridge.",
    "Use PreTokenGeneration trigger to add least-privilege claims.",
    "Use DLQ-backed Lambda triggers for profile provisioning and welcome workflows.",
  ],
  costAndQuota: [
    "Avoid unnecessary dedicated pools per environment/tenant when shared isolation is acceptable.",
    "Review MAU pricing, SMS/MFA costs, and Lambda trigger costs.",
    "Throttle abusive clients at API Gateway/WAF before they create identity cost or quota pressure.",
  ],
});
