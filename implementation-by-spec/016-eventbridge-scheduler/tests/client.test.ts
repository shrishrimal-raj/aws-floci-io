import { describe, it, expect, vi } from "vitest";
import type { SchedulerClient } from "@aws-sdk/client-scheduler";
import { client } from "../src/client.js";
import type { EventBridgeSchedulerError } from "../src/errors.js";
import {
  atExpression,
  buildTenantScheduleInput,
  createSchedule,
  createScheduleLifecyclePolicy,
  createSchedulerAuditEvent,
  createSchedulerRetryPolicy,
  createScheduleObservabilityPlan,
  cronExpression,
  estimateSchedulerMonthlyCost,
  everyMinutes,
  getSchedule,
  scheduleTarget,
  shouldDeleteOneTimeSchedule,
  validateScheduleName,
} from "../src/use-cases/schedules.js";

function failingClient(name: string): SchedulerClient {
  return {
    send: vi.fn(async () => {
      const error = new Error(`${name} failed`);
      error.name = name;
      throw error;
    }),
  } as unknown as SchedulerClient;
}

function captureClient(): { scheduler: SchedulerClient; send: ReturnType<typeof vi.fn> } {
  const send = vi.fn(async (command: { input?: unknown }) => ({ ok: true, input: command.input }));
  return { scheduler: { send } as unknown as SchedulerClient, send };
}

describe("EventBridge Scheduler", () => {
  it("client is configured against Floci", () => expect(client).toBeDefined());

  it("builds schedule expressions and targets", () => {
    expect(everyMinutes(5)).toBe("rate(5 minutes)");
    expect(cronExpression("0", "12")).toBe("cron(0 12 * * ? *)");
    expect(atExpression("2026-01-01T00:00:00Z")).toBe("at(2026-01-01T00:00:00)");
    expect(scheduleTarget("arn", "role", { ok: true })).toMatchObject({ arn: "arn", roleArn: "role" });
  });

  it("validates schedule names and rate expressions", () => {
    expect(validateScheduleName("tenant-acme_nightly.export-1")).toBe("tenant-acme_nightly.export-1");
    expect(() => validateScheduleName("bad name")).toThrow("Schedule name must be 1-64 chars");
    expect(() => everyMinutes(0)).toThrow("Minute rate must be a positive integer");
  });

  it("creates schedule with enterprise target options", async () => {
    const { scheduler, send } = captureClient();
    const target = scheduleTarget("arn:target", "arn:role", { tenantId: "acme" }, {
      deadLetterQueueArn: "arn:dlq",
      retryPolicy: createSchedulerRetryPolicy("fast"),
    });
    await createSchedule({ name: "tenant-acme-export", expression: everyMinutes(15), target, groupName: "tenant-jobs", timezone: "UTC", flexibleWindowMinutes: 10 }, scheduler);
    expect(send.mock.calls[0]?.[0].input).toMatchObject({
      Name: "tenant-acme-export",
      GroupName: "tenant-jobs",
      FlexibleTimeWindow: { Mode: "FLEXIBLE", MaximumWindowInMinutes: 10 },
      Target: { Arn: "arn:target", RoleArn: "arn:role", DeadLetterConfig: { Arn: "arn:dlq" }, RetryPolicy: { MaximumRetryAttempts: 3 } },
    });
  });

  it("wraps create failures in scheduler error", async () => {
    await expect(
      createSchedule({ name: "x", expression: everyMinutes(1), target: scheduleTarget("arn", "role") }, failingClient("AccessDeniedException")),
    ).rejects.toMatchObject({
      code: "EVENTBRIDGE_SCHEDULER_AccessDeniedException",
      message: "EventBridge Scheduler createSchedule failed",
    } satisfies Partial<EventBridgeSchedulerError>);
  });

  it("wraps get failures in scheduler error", async () => {
    await expect(getSchedule("x", failingClient("ResourceNotFoundException"))).rejects.toMatchObject({
      code: "EVENTBRIDGE_SCHEDULER_ResourceNotFoundException",
      message: "EventBridge Scheduler getSchedule failed",
    } satisfies Partial<EventBridgeSchedulerError>);
  });

  it("builds tenant input and audit events", () => {
    expect(buildTenantScheduleInput({ tenantId: "acme", jobType: "export", requestedBy: "data", traceId: "t-1", payload: { bucket: "b" } })).toMatchObject({ tenantId: "acme" });
    expect(() => buildTenantScheduleInput({ tenantId: "", jobType: "export", requestedBy: "data", traceId: "t-1", payload: {} })).toThrow("tenantId, jobType, requestedBy, and traceId are required");
    expect(createSchedulerAuditEvent({ operation: "CreateSchedule", scheduleName: "job", actor: "bot", outcome: "ALLOW", timestamp: "2026-05-30T00:00:00.000Z" })).toMatchObject({ service: "eventbridge-scheduler", scheduleName: "job" });
  });

  it("creates lifecycle and observability plans", () => {
    expect(createScheduleLifecyclePolicy({ scheduleName: "grc", owner: "security", environment: "prod", regulated: true })).toMatchObject({ backupRequired: true, disasterRecovery: "cross-region-recreate", retentionDays: 2555 });
    expect(createScheduleObservabilityPlan("payments-retry", "step-functions").alarms).toContain("payments-retry-target-errors");
  });

  it("estimates scheduler cost and cleanup", () => {
    expect(estimateSchedulerMonthlyCost({ schedules: 2_000, invocationsPerSchedulePerDay: 96 })).toMatchObject({ monthlyInvocations: 5_760_000, estimatedMonthlyUsd: 5.76 });
    expect(shouldDeleteOneTimeSchedule("at(2026-01-01T00:00:00)", new Date("2026-01-01T00:00:01Z"))).toBe(true);
    expect(shouldDeleteOneTimeSchedule("rate(5 minutes)")).toBe(false);
  });
});
