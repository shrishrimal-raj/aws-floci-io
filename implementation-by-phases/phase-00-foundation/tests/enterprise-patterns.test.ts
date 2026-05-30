import { describe, expect, it, vi } from "vitest";
import {
  buildEnterpriseTags,
  createAuditEvent,
  enterpriseClientDefaults,
  lifecyclePlanFor,
  maskAccountId,
  observabilityPlanFor,
  complianceControlsFor,
  summarizeReadiness,
  withRetry,
} from "../src/index.js";

describe("enterprise foundation patterns", () => {
  it("builds standard governance tags", () => {
    expect(
      buildEnterpriseTags(
        {
          application: "orders-platform",
          environment: "prod",
          owner: "platform",
          costCenter: "cc-1001",
          dataClassification: "confidential",
        },
        { Backup: "required" }
      )
    ).toMatchObject({
      Application: "orders-platform",
      Environment: "prod",
      ManagedBy: "floci-phase-00",
      Backup: "required",
    });
  });

  it("creates masked audit events from ARNs", () => {
    const event = createAuditEvent({
      actor: "ci-role",
      action: "sqs.queue.create",
      resourceArn: "arn:aws:sqs:us-east-1:123456789012:orders-events",
      result: "success",
      now: new Date("2026-01-01T00:00:00.000Z"),
    });

    expect(event).toMatchObject({
      accountId: "********9012",
      service: "sqs",
      region: "us-east-1",
      at: "2026-01-01T00:00:00.000Z",
    });
    expect(maskAccountId("bad")).toBe("invalid-account");
  });

  it("retries transient failures then returns success", async () => {
    vi.useFakeTimers();
    const operation = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(Object.assign(new Error("try again"), { name: "TimeoutError" }))
      .mockResolvedValueOnce("ok");

    const result = withRetry(operation, { attempts: 2, baseDelayMs: 1, maxDelayMs: 1 });
    await vi.runAllTimersAsync();

    await expect(result).resolves.toBe("ok");
    expect(operation).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it("documents lifecycle plans and client defaults", () => {
    expect(lifecyclePlanFor("dynamodb", "prod")).toMatchObject({
      backupRequired: true,
      disasterRecovery: "cross-region",
    });
    expect(enterpriseClientDefaults({ endpoint: "http://localhost:4566" })).toMatchObject({
      endpoint: "http://localhost:4566",
      maxAttempts: 5,
    });
  });

  it("creates observability plans and compliance evidence", () => {
    expect(observabilityPlanFor(["s3"])[0]).toMatchObject({
      service: "s3",
      metrics: ["s3_request_count", "s3_error_count", "s3_latency_ms"],
    });
    expect(complianceControlsFor(["floci"])).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: "FOUNDATION-002" })])
    );
  });

  it("summarizes smoke-test readiness with next action", () => {
    expect(
      summarizeReadiness([
        { name: "floci", status: "pass", detail: "ok", ms: 10 },
        { name: "sqs", status: "fail", detail: "missing queue", ms: 20 },
      ])
    ).toMatchObject({
      passed: false,
      total: 2,
      failed: 1,
      slowestService: "sqs",
      failedServices: ["sqs"],
    });
  });
});
