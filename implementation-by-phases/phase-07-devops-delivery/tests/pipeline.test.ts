import { describe, expect, it } from "vitest";
import { createSelfServicePipeline, nextPipelineAction, shouldRollback } from "../src/index.js";

describe("self-service delivery pipeline", () => {
  it("models source-build-blue-green lifecycle", () => {
    const pipeline = createSelfServicePipeline("github.com/acme/api", "api");
    expect(pipeline.stages.map((stage) => stage.name)).toEqual(["Source", "Build", "DeployGreen", "ShiftTraffic", "Bake"]);
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
});
