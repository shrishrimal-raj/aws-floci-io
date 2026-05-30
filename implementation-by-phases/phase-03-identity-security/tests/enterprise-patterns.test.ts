import { describe, expect, it } from "vitest";
import { authorizeTenantRequest, redactClaimsForLog, requireTenantRole, securityLifecycleDecision } from "../src/enterprise-patterns.js";
import type { CognitoClaims } from "../src/jwt-auth.js";

const claims: CognitoClaims = {
  iss: "issuer",
  aud: "client",
  exp: 2_000_000_000,
  sub: "user-1",
  email: "user@example.com",
  token_use: "id",
  "custom:tenant_id": "tenant-a",
  "custom:role": "tenant_admin",
};

describe("enterprise identity security patterns", () => {
  it("authorizes tenant boundary and audits deny", () => {
    expect(authorizeTenantRequest({ actor: "user-1", tenantId: "tenant-a", requestedTenantId: "tenant-a", action: "read", resource: "task" }, new Date("2026-01-01T00:00:00.000Z"))).toMatchObject({ decision: "allow", reason: "tenant-match" });
    expect(authorizeTenantRequest({ actor: "user-1", tenantId: "tenant-a", requestedTenantId: "tenant-b", action: "read", resource: "task" })).toMatchObject({ decision: "deny", reason: "tenant-mismatch" });
  });

  it("requires tenant role and redacts claims", () => {
    expect(requireTenantRole(claims, ["tenant_admin"])).toMatchObject({ tenantId: "tenant-a" });
    expect(() => requireTenantRole(claims, ["viewer"])).toThrow("JWT role not authorized");
    expect(redactClaimsForLog(claims)).toMatchObject({ email: "[REDACTED]", tenantId: "tenant-a" });
  });

  it("decides security lifecycle actions", () => {
    expect(
      securityLifecycleDecision(
        "2026-01-01T00:00:00.000Z",
        "2025-01-01T00:00:00.000Z",
        { rotateSecretsAfterDays: 90, disableInactiveUsersAfterDays: 180 },
        new Date("2026-05-30T00:00:00.000Z")
      )
    ).toEqual({ rotateSecret: true, disableUser: true });
  });
});
