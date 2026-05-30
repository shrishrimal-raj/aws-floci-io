#!/usr/bin/env tsx
import { archiveLifecyclePlan, auditEvent, type TenantActor } from "../index.js";

const securityOfficer: TenantActor = {
  tenantId: "tenant-a",
  principalId: "security-officer-1",
  roles: ["admin"],
  requestId: "audit-req-001",
};

console.log(
  "archive plan",
  archiveLifecyclePlan("orders-bus", "orders-archive", 365, 30, "SOX/SOC2 evidence plus incident replay for order projections")
);

console.log(
  "audit event",
  auditEvent(securityOfficer, "security-audit-bus", "eventbridge.archive.review", "orders-archive", "success", "quarterly compliance review")
);
