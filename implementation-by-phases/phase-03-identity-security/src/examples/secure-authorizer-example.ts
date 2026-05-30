import { authorizeTenantRequest, redactClaimsForLog, requireTenantRole } from "../enterprise-patterns.js";
import type { CognitoClaims } from "../jwt-auth.js";

/**
 * Real-world authorizer pattern: validate tenant role, enforce tenant boundary, emit audit-safe log payload.
 */
export function secureAuthorizerExample() {
  const claims: CognitoClaims = {
    iss: "https://cognito-idp.us-east-1.amazonaws.com/pool",
    aud: "client-1",
    exp: 2_000_000_000,
    token_use: "id",
    sub: "user-123",
    email: "admin@acme.example",
    "custom:tenant_id": "tenant-a",
    "custom:role": "tenant_admin",
  };

  const context = requireTenantRole(claims, ["tenant_admin"]);
  const audit = authorizeTenantRequest({
    actor: context.subject,
    tenantId: context.tenantId,
    requestedTenantId: "tenant-a",
    action: "Task.Read",
    resource: "tenant/tenant-a/tasks",
  });

  return { context: { subject: context.subject, tenantId: context.tenantId }, audit, logClaims: redactClaimsForLog(claims) };
}
