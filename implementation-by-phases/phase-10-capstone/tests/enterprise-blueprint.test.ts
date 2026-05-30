import { describe, expect, it } from "vitest";
import {
  CAPSTONE_PROJECTS,
  complianceControls,
  costControls,
  createAuditRecord,
  dataLifecyclePolicy,
  disasterRecoveryPlan,
  evaluateAccess,
  eventRoute,
  generateEnterpriseBlueprint,
  observabilityPlan,
  retryPolicy,
  type TenantContext,
} from "../src/index.js";

const context: TenantContext = {
  tenantId: "tenant-a",
  principalId: "admin-1",
  roles: ["admin"],
  requestId: "req-1",
  region: "us-east-1",
};

describe("enterprise capstone blueprint helpers", () => {
  it("evaluates secure tenant and role access", () => {
    expect(evaluateAccess(context, "tenant-a", "admin")).toMatchObject({ allowed: true });
    expect(evaluateAccess(context, "tenant-b", "admin")).toMatchObject({ allowed: false, reason: "cross-tenant access denied" });
    expect(evaluateAccess({ ...context, roles: ["reader"] }, "tenant-a", "admin")).toMatchObject({ allowed: false, reason: "missing required role" });
  });

  it("creates audit and retry plans", () => {
    const audit = createAuditRecord(context, "deploy", "capstone-010", "success");
    expect(audit).toMatchObject({ tenantId: "tenant-a", principalId: "admin-1", requestId: "req-1" });
    expect(retryPolicy({ maxAttempts: 5 })).toMatchObject({ maxAttempts: 5, baseDelayMs: 100 });
  });

  it("defines event routes and data lifecycle policies", () => {
    expect(eventRoute("orders", "OrderCreated", ["billing", "fulfillment"])).toMatchObject({ deadLetterQueue: "ordercreated-dlq" });
    expect(dataLifecyclePolicy("orders", 2555)).toMatchObject({ hotDays: 30, warmDays: 365, retentionDays: 2555 });
  });

  it("defines observability, cost, disaster recovery, and compliance controls", () => {
    const finalProject = CAPSTONE_PROJECTS.find((project) => project.id === "010")!;
    expect(observabilityPlan("checkout").alarms).toContain("checkout-dlq-depth");
    expect(costControls(finalProject).map((control) => control.service)).toContain("S3");
    expect(disasterRecoveryPlan("checkout")).toMatchObject({ strategy: "warm-standby", crossRegion: true });
    expect(complianceControls("SOC2")).toHaveLength(4);
  });

  it("generates full enterprise blueprint for final capstone", () => {
    const finalProject = CAPSTONE_PROJECTS.find((project) => project.id === "010")!;
    const blueprint = generateEnterpriseBlueprint(finalProject, context);
    expect(blueprint.productionGrade).toBe(true);
    expect(blueprint.events.at(0)?.targets).toContain("billing-lambda");
    expect(blueprint.lifecycle.map((policy) => policy.dataset)).toContain("audit-logs");
    expect(blueprint.compliance.map((control) => control.control)).toContain("Auditability");
  });
});
