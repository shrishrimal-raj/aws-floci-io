import { describe, expect, it } from "vitest";
import { backupCompliance, budgetVariancePercent, costOptimizationRecommendation, disasterRecoveryPosture, forecastMonthlyCost, groupCostByTag, tagDriftReport, toEmbeddedMetricFormat, validateRequiredTags } from "../src/index.js";

describe("Phase 08 observability and cost helpers", () => {
  it("emits CloudWatch embedded metric format", () => {
    const emf = JSON.parse(toEmbeddedMetricFormat({ namespace: "TaskFlow", service: "api", name: "Latency", value: 42, unit: "Milliseconds", dimensions: { Environment: "dev" } }));
    expect(emf.Service).toBe("api");
    expect(emf.Latency).toBe(42);
    expect(emf._aws.CloudWatchMetrics[0].Dimensions[0]).toContain("Environment");
  });

  it("finds missing required tags", () => {
    expect(validateRequiredTags({ arn: "arn:aws:s3:::bucket", tags: { Environment: "dev", Owner: "ops" } })).toEqual(["CostCenter", "Project"]);
  });

  it("groups costs by allocation tag", () => {
    expect(groupCostByTag([
      { service: "S3", amountUsd: 1.25, tags: { Project: "alpha" } },
      { service: "Lambda", amountUsd: 2, tags: { Project: "alpha" } },
      { service: "EC2", amountUsd: 3, tags: {} },
    ], "Project")).toEqual({ alpha: 3.25, "<untagged>": 3 });
  });

  it("forecasts monthly cost and backup compliance", () => {
    expect(forecastMonthlyCost([10, 20], 30)).toBe(450);
    expect(backupCompliance([{ arn: "a", protected: true }, { arn: "b", protected: false }])).toEqual({ protected: 1, unprotected: ["b"] });
    expect(disasterRecoveryPosture([{ arn: "a", protected: true, criticality: "high" }, { arn: "b", protected: false, criticality: "high" }])).toEqual({ criticalUnprotected: ["b"], coveragePercent: 50 });
  });

  it("detects tag drift and cost variance recommendations", () => {
    expect(tagDriftReport([{ arn: "a", tags: { Environment: "prod", Owner: "ops", CostCenter: "1", Project: "x" } }], [{ arn: "a", tags: { Environment: "prod", Owner: "ops", CostCenter: "2", Project: "x" } }])).toEqual([{ arn: "a", driftedTags: ["CostCenter"] }]);
    expect(budgetVariancePercent(120, 100)).toBe(20);
    expect(costOptimizationRecommendation({ forecastUsd: 120, budgetUsd: 100, untaggedCostUsd: 0 })).toContain("over budget");
  });
});
