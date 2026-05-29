#!/usr/bin/env tsx
import {
  assertJwtAudience,
  assertJwtClaims,
  authAuditEvent,
  decodeJwtPayload,
  redactJwtClaims,
} from "../use-cases/user-pools.js";

const expectedClientId = "payments-api-client";
const requestId = "api-req-001";
const tokenPayload = Buffer.from(
  JSON.stringify({
    sub: "user-123",
    email: "buyer@example.com",
    token_use: "access",
    client_id: expectedClientId,
    scope: "orders:read orders:write",
    exp: Math.floor(Date.now() / 1000) + 900,
  })
).toString("base64url");

try {
  const claims = decodeJwtPayload(`header.${tokenPayload}.signature`);
  assertJwtClaims(claims, "access");
  assertJwtAudience(claims, expectedClientId);

  console.log({
    scenario: "API authorizer claim checks",
    decision: "allow",
    safeClaims: redactJwtClaims(claims),
    audit: authAuditEvent("auth.claims.accepted", claims, requestId),
    productionIntegration: [
      "API Gateway REST custom authorizer or Lambda middleware validates token before business handler.",
      "CloudWatch metric increments AuthAllowed/AuthDenied by route and tenant.",
      "Rejected decisions are logged with reason, never raw token.",
    ],
  });
} catch (error) {
  const reason = error instanceof Error ? error.message : "unknown auth error";
  console.log({
    scenario: "API authorizer claim checks",
    decision: "deny",
    audit: authAuditEvent("auth.claims.rejected", {}, requestId, reason),
  });
  throw error;
}
