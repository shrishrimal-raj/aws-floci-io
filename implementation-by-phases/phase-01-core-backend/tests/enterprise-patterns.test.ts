import { describe, expect, it, vi } from "vitest";
import { assertTenantAccess, createAuditEvent, decideTaskLifecycle, redactForLog, withRetry } from "../src/enterprise-patterns.js";
import type { Task } from "../src/taskflow-model.js";

const doneTask: Task = {
  tenantId: "tenant-a",
  taskId: "task-1",
  title: "Close audit finding",
  status: "done",
  attachmentKeys: [],
  createdAt: "2020-01-01T00:00:00.000Z",
  updatedAt: "2020-01-01T00:00:00.000Z",
};

describe("enterprise helper patterns", () => {
  it("blocks cross-tenant access", () => {
    expect(() => assertTenantAccess("tenant-b", "tenant-a")).toThrow("Tenant access denied");
  });

  it("creates audit event and redacts sensitive values", () => {
    const audit = createAuditEvent(
      { tenantId: "tenant-a", principalId: "user-1", requestId: "req-1" },
      "Task.Create",
      "task/task-1",
      "success",
      { title: "Close audit finding" },
      new Date("2026-01-01T00:00:00.000Z")
    );
    expect(audit).toMatchObject({ action: "Task.Create", outcome: "success", occurredAt: "2026-01-01T00:00:00.000Z" });
    expect(redactForLog({ token: "secret", tenantId: "tenant-a" })).toEqual({ token: "[REDACTED]", tenantId: "tenant-a" });
  });

  it("classifies archive and delete lifecycle decisions", () => {
    expect(decideTaskLifecycle(doneTask, { archiveDoneAfterDays: 90, deleteDoneAfterDays: 2555 }, new Date("2021-01-01T00:00:00.000Z"))).toBe("archive");
    expect(decideTaskLifecycle(doneTask, { archiveDoneAfterDays: 90, deleteDoneAfterDays: 2555 }, new Date("2028-01-01T00:00:00.000Z"))).toBe("delete");
  });

  it("retries transient failures", async () => {
    vi.useFakeTimers();
    let attempts = 0;
    const resultPromise = withRetry(
      async () => {
        attempts += 1;
        if (attempts < 2) {
          const error = new Error("ThrottlingException");
          error.name = "ThrottlingException";
          throw error;
        }
        return "ok";
      },
      { maxAttempts: 2, baseDelayMs: 1, maxDelayMs: 1 }
    );
    await vi.runAllTimersAsync();
    await expect(resultPromise).resolves.toBe("ok");
    vi.useRealTimers();
  });
});
