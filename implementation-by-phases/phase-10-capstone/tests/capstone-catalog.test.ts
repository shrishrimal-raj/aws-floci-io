import { describe, expect, it } from "vitest";
import { CAPSTONE_PROJECTS, productionReadinessScore, recommendCapstones, serviceCoverage } from "../src/index.js";

describe("Phase 10 capstone catalog", () => {
  it("tracks ten production-shaped projects", () => {
    expect(CAPSTONE_PROJECTS).toHaveLength(10);
    expect(CAPSTONE_PROJECTS.at(-1)?.services.length).toBeGreaterThanOrEqual(10);
  });

  it("computes unique service coverage", () => {
    const coverage = serviceCoverage();
    expect(coverage).toContain("S3");
    expect(coverage).toContain("DynamoDB");
    expect(coverage).toContain("CodeDeploy");
  });

  it("recommends focused capstones plus final enterprise backend", () => {
    expect(recommendCapstones("events").map((project) => project.id)).toEqual(["002", "004", "010"]);
  });

  it("scores production readiness dimensions", () => {
    const finalProject = CAPSTONE_PROJECTS.find((project) => project.id === "010");
    expect(finalProject).toBeDefined();
    expect(productionReadinessScore(finalProject!)).toBe(4);
  });
});
