import { describe, expect, it } from "vitest";
import { commandCenterSnapshot, detectCostAnomalies, opsAuditEvent, redactOpsPayload, tagComplianceTicket } from "../src/index.js";

describe("enterprise ops and cost patterns", () => {
  it("creates redacted audit events", () => {
    const audit = opsAuditEvent(
      { actor: "sre", action: "Budget.Override", resource: "taskflow", outcome: "success", details: redactOpsPayload({ token: "secret", reason: "launch" }) },
      new Date("2026-01-01T00:00:00.000Z")
    );
    expect(audit).toMatchObject({ at: "2026-01-01T00:00:00.000Z", details: { token: "[REDACTED]", reason: "launch" } });
  });

  it("detects cost anomalies", () => {
    expect(detectCostAnomalies([{ service: "DynamoDB", amountUsd: 150, tags: {} }], { DynamoDB: 100 }, 25)).toEqual([
      { service: "DynamoDB", amountUsd: 150, baselineUsd: 100, variancePercent: 50 },
    ]);
  });

  it("builds command center snapshot and tag ticket", () => {
    const snapshot = commandCenterSnapshot({
      slo: { service: "api", targetAvailability: 99, totalRequests: 1000, failedRequests: 1 },
      alarms: [],
      dailyCosts: [10, 20],
      budgetUsd: 400,
      costs: [{ service: "Lambda", amountUsd: 10, tags: { Project: "api" } }],
    });
    expect(snapshot).toMatchObject({ forecastUsd: 450, budgetVariancePercent: 12.5 });
    expect(tagComplianceTicket({ arn: "arn", tags: { Environment: "prod" } }, ["Owner"])).toMatchObject({ severity: "high" });
  });
});
