#!/usr/bin/env tsx
import {
  assertJwtAudience,
  assertJwtClaims,
  authAuditEvent,
  decodeJwtPayload,
  isJwtExpired,
  redactJwtClaims,
} from "../use-cases/user-pools.js";

const clientId = "web-client-123";
const payload = Buffer.from(
  JSON.stringify({
    sub: "u1",
    email: "ada@example.com",
    token_use: "access",
    client_id: clientId,
    iss: "https://cognito-idp.us-east-1.amazonaws.com/us-east-1_example",
    exp: Math.floor(Date.now() / 1000) + 3600,
  })
).toString("base64url");
const claims = decodeJwtPayload(`header.${payload}.signature`);

assertJwtClaims(claims, "access");
assertJwtAudience(claims, clientId);

console.log({
  scenario: "local JWT claim validation for API middleware",
  safeClaims: redactJwtClaims(claims),
  expired: isJwtExpired(claims),
  audit: authAuditEvent("auth.claims.accepted", claims, "req-123"),
  warning: "Local decode only. Production must verify signature with Cognito JWKS before trusting claims.",
});
