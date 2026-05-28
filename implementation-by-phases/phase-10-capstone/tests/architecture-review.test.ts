import { describe, expect, it } from "vitest";
import { CAPSTONE_PROJECTS, isProductionGrade, missingEnterpriseConcerns, reviewSummary } from "../src/index.js";

describe("enterprise architecture review", () => {
  it("finds missing concerns for small capstones", () => {
    const storageApi = CAPSTONE_PROJECTS.find((project) => project.id === "001")!;
    expect(missingEnterpriseConcerns(storageApi)).toContain("security");
    expect(isProductionGrade(storageApi)).toBe(false);
  });

  it("accepts final capstone as production-grade", () => {
    const finalProject = CAPSTONE_PROJECTS.find((project) => project.id === "010")!;
    expect(isProductionGrade(finalProject)).toBe(true);
    expect(reviewSummary(finalProject)).toContain("covers enterprise production concerns");
  });
});
