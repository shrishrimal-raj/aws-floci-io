import { describe, expect, it } from "vitest";
import { availabilityPercent, errorBudgetBurnRate, errorBudgetRemaining, serviceHealth, serviceHealthSummary, slackAlertText } from "../src/index.js";

describe("error budget command center", () => {
  it("calculates availability and remaining budget", () => {
    const slo = { service: "api", targetAvailability: 99, totalRequests: 10_000, failedRequests: 20 };
    expect(availabilityPercent(slo)).toBe(99.8);
    expect(errorBudgetRemaining(slo)).toBe(80);
    expect(errorBudgetBurnRate(slo)).toBe(0.2);
  });

  it("marks services breached by alarms", () => {
    const slo = { service: "api", targetAvailability: 99.9, totalRequests: 1000, failedRequests: 0 };
    expect(serviceHealth(slo, [{ name: "5xx", state: "ALARM", reason: "too many errors" }])).toBe("breached");
  });

  it("formats Slack alert text and summary", () => {
    expect(slackAlertText("api", "at_risk", "budget below 25%")).toBe("[AT_RISK] api: budget below 25%");
    expect(serviceHealthSummary({ service: "api", targetAvailability: 99, totalRequests: 100, failedRequests: 0 }, [])).toMatchObject({ health: "healthy", burnRate: 0 });
  });
});
