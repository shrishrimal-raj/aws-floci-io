import { describe, expect, it } from "vitest";
import { allPassed, renderStatusBoard, type SmokeResult } from "../src/smoke-tests.js";

const results: SmokeResult[] = [
  { name: "floci", status: "pass", detail: "health endpoint ok", ms: 12 },
  { name: "s3", status: "fail", detail: "created bucket missing", ms: 34 },
];

describe("Floci lab bench status board", () => {
  it("renders green/red service rows", () => {
    expect(renderStatusBoard(results)).toContain("floci   | green");
    expect(renderStatusBoard(results)).toContain("s3      | red");
  });

  it("computes aggregate pass/fail", () => {
    expect(allPassed(results)).toBe(false);
    expect(allPassed([{ name: "sqs", status: "pass", detail: "ok", ms: 1 }])).toBe(true);
  });
});
