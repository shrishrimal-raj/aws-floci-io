import { describe, expect, it } from "vitest";
import { chooseDeploymentStrategy, createBlueGreenRollbackPolicy, createLambdaCanaryPlan, createNodeBuildSpec } from "../src/index.js";

describe("Phase 07 DevOps delivery helpers", () => {
  it("builds CodeBuild buildspec phases", () => {
    const spec = createNodeBuildSpec({ appName: "api" });
    expect(spec.version).toBe("0.2");
    expect(spec.phases.install.commands).toContain("pnpm install --frozen-lockfile");
    expect(spec.phases.pre_build.commands).toEqual(["pnpm test"]);
    expect(spec.artifacts.files).toContain("appspec.yml");
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
});
