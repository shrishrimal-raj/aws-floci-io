import { authContextFromClaims, type AuthContext, type CognitoClaims } from "./jwt-auth.js";
import { auditEvent, type AuditEvent } from "./sts-acm-audit.js";

export interface TenantAccessRequest {
  actor: string;
  tenantId: string;
  requestedTenantId: string;
  action: string;
  resource: string;
}

export interface SecurityLifecyclePolicy {
  rotateSecretsAfterDays: number;
  disableInactiveUsersAfterDays: number;
}

/**
 * Enforces tenant boundary and returns audit event for allow/deny decision.
 *
 * Example: Lambda authorizer rejects tenant-a user trying to read tenant-b invoice before DynamoDB query executes.
 */
export function authorizeTenantRequest(request: TenantAccessRequest, now = new Date()): AuditEvent {
  const allowed = request.tenantId === request.requestedTenantId;
  return auditEvent(
    {
      tenantId: request.tenantId,
      actor: request.actor,
      action: request.action,
      resource: request.resource,
      decision: allowed ? "allow" : "deny",
      reason: allowed ? "tenant-match" : "tenant-mismatch",
    },
    now
  );
}

/**
 * Builds auth context from claims and checks required tenant role.
 *
 * Example: admin API requires `custom:role=tenant_admin`; regular users receive deny audit event.
 */
export function requireTenantRole(claims: CognitoClaims, allowedRoles: string[]): AuthContext {
  const context = authContextFromClaims(claims);
  const role = claims["custom:role"];
  if (typeof role !== "string" || !allowedRoles.includes(role)) throw new Error("JWT role not authorized");
  return context;
}

/**
 * Redacts claims before debug logs.
 *
 * Example: include issuer, subject, tenant, and token_use in CloudWatch while removing raw email and custom PII fields.
 */
export function redactClaimsForLog(claims: CognitoClaims): Record<string, unknown> {
  return {
    iss: claims.iss,
    sub: claims.sub,
    token_use: claims.token_use,
    tenantId: claims["custom:tenant_id"],
    email: claims.email ? "[REDACTED]" : undefined,
  };
}

/**
 * Decides identity lifecycle actions for compliance and cost control.
 *
 * Example: rotate KMS-protected API key after 90 days and disable dormant user after 180 days.
 */
export function securityLifecycleDecision(
  lastRotatedAt: string,
  lastLoginAt: string,
  policy: SecurityLifecyclePolicy,
  now = new Date()
): { rotateSecret: boolean; disableUser: boolean } {
  const secretAgeDays = daysBetween(lastRotatedAt, now);
  const inactiveDays = daysBetween(lastLoginAt, now);
  return {
    rotateSecret: secretAgeDays >= policy.rotateSecretsAfterDays,
    disableUser: inactiveDays >= policy.disableInactiveUsersAfterDays,
  };
}

function daysBetween(iso: string, now: Date): number {
  return Math.floor((now.getTime() - new Date(iso).getTime()) / 86_400_000);
}
