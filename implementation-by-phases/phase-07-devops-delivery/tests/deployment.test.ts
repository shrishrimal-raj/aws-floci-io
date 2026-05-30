import { describe, expect, it } from "vitest";
import {
  chooseDeploymentStrategy,
  createArtifactLifecyclePolicy,
  createBlueGreenRollbackPolicy,
  createDeploymentAuditEvent,
  createLambdaCanaryPlan,
  createNodeBuildSpec,
  createObservabilityRunbook,
  createRetryPolicy,
} from "../src/index.js";

describe("Phase 07 DevOps delivery helpers", () => {
  it("builds CodeBuild buildspec phases", () => {
    const spec = createNodeBuildSpec({ appName: "api" });
    expect(spec.version).toBe("0.2");
    expect(spec.phases.install.commands).toContain("pnpm install --frozen-lockfile");
    expect(spec.phases.pre_build.commands).toEqual(["pnpm test"]);
    expect(spec.artifacts.files).toContain("appspec.yml");
  });

  it("adds enterprise quality gates and variables", () => {
    const spec = createNodeBuildSpec({
      appName: "orders-api",
      qualityGateCommands: ["pnpm lint", "pnpm test", "pnpm audit --audit-level high"],
      envVariables: { SERVICE: "orders" },
    });
    expect(spec.env.variables).toMatchObject({ APP_NAME: "orders-api", SERVICE: "orders" });
    expect(spec.phases.pre_build.commands).toContain("pnpm audit --audit-level high");
  });

  it("creates Lambda canary traffic shift", () => {
    expect(createLambdaCanaryPlan(10, 5)).toEqual([
      { percent: 10, bakeMinutes: 5 },
      { percent: 100, bakeMinutes: 0 },
    ]);
  });

  it("requires alarms for automated rollback", () => {
    expect(() => createBlueGreenRollbackPolicy("api", [])).toThrow("at least one alarm");
    expect(createBlueGreenRollbackPolicy("api", ["5xxAlarm"])).toMatchObject({ rollbackOnFailure: true, alarms: ["5xxAlarm"] });
  });

  it("chooses deployment strategy by target and risk", () => {
    expect(chooseDeploymentStrategy("ecs", false)).toBe("blue_green");
    expect(chooseDeploymentStrategy("lambda", true)).toBe("canary");
    expect(chooseDeploymentStrategy("lambda", false)).toBe("rolling");
  });

  it("creates auditable deployment event", () => {
    const event = createDeploymentAuditEvent({
      eventType: "deployment.requested",
      appName: "api",
      environment: "prod",
      actor: "release-bot",
      strategy: "blue_green",
      changeId: "CHG-1",
      risk: "high",
      timestamp: "2026-05-30T00:00:00.000Z",
      evidence: { pr: "88" },
    });
    expect(event).toMatchObject({ appName: "api", changeId: "CHG-1", evidence: { pr: "88" } });
  });

  it("creates retry, lifecycle, and observability policies", () => {
    expect(createRetryPolicy("fast").backoffSeconds).toEqual([1, 2, 4]);
    expect(createArtifactLifecyclePolicy({ environment: "prod", classification: "restricted" })).toMatchObject({ immutable: true, cleanupAction: "archive" });
    expect(createObservabilityRunbook("api", { availabilityPercent: 99.9, p95LatencyMs: 250 }).alarms).toContain("api-p95-latency-250ms");
  });
});
