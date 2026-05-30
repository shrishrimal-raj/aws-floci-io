import { describe, expect, it } from "vitest";
import {
  createCrossAccountPromotionPlan,
  createSelfServicePipeline,
  estimatePipelineMonthlyCost,
  evaluatePipelineGuardrails,
  nextPipelineAction,
  planDisasterRecoveryDrill,
  shouldRollback,
} from "../src/index.js";

describe("self-service delivery pipeline", () => {
  it("models source-build-blue-green lifecycle", () => {
    const pipeline = createSelfServicePipeline("github.com/acme/api", "api");
    expect(pipeline.stages.map((stage) => stage.name)).toEqual(["Source", "Build", "DeployGreen", "ShiftTraffic", "Bake"]);
    expect(pipeline.stages[1]?.actions).toContain("Run SAST");
  });

  it("finds next incomplete stage", () => {
    const pipeline = createSelfServicePipeline("repo", "api");
    expect(nextPipelineAction(pipeline, ["Source", "Build"])?.name).toBe("DeployGreen");
  });

  it("rolls back on alarm or failed hook", () => {
    const stage = createSelfServicePipeline("repo", "api").stages[3]!;
    expect(shouldRollback(stage, "ALARM", true)).toBe(true);
    expect(shouldRollback(stage, "OK", false)).toBe(true);
    expect(shouldRollback(stage, "OK", true)).toBe(false);
  });

  it("blocks production deployments without guardrails", () => {
    expect(
      evaluatePipelineGuardrails({ environment: "prod", approvers: ["lead"], securityScanPassed: false, alarmState: "OK" }),
    ).toEqual({
      approved: false,
      findings: ["security scan must pass before deployment", "production requires two approvers", "production requires change ticket"],
    });
  });

  it("creates promotion plan with least-privilege role names", () => {
    const plan = createCrossAccountPromotionPlan("api", ["dev", "stage", "prod"]);
    expect(plan.map((step) => step.requiredApprovers)).toEqual([0, 1, 2]);
    expect(plan[2]?.deploymentRole).toContain("api-prod-deploy-role");
  });

  it("estimates cost and plans disaster recovery drills", () => {
    expect(estimatePipelineMonthlyCost({ buildsPerDay: 10, averageBuildMinutes: 5 })).toMatchObject({ monthlyBuildMinutes: 1500, estimatedCodeBuildUsd: 7.5 });
    expect(planDisasterRecoveryDrill("api", "us-west-2").recoveryActions).toContain("promote replicated artifact in us-west-2");
  });
});
