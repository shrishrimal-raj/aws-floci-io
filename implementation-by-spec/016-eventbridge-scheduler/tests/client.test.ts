import { describe, it, expect, beforeAll, vi } from "vitest";
import type { SchedulerClient } from "@aws-sdk/client-scheduler";
import { waitForFloci } from "@floci-lab/test-utils";
import { client } from "../src/client.js";
import type { EventBridgeSchedulerError } from "../src/errors.js";
import { atExpression, createSchedule, cronExpression, everyMinutes, getSchedule, scheduleTarget } from "../src/use-cases/schedules.js";

function failingClient(name: string): SchedulerClient {
  return {
    send: vi.fn(async () => {
      const error = new Error(`${name} failed`);
      error.name = name;
      throw error;
    }),
  } as unknown as SchedulerClient;
}

describe("EventBridge Scheduler", () => {
  beforeAll(async () => waitForFloci());

  it("client is configured against Floci", () => expect(client).toBeDefined());

  it("builds schedule expressions and targets", () => {
    expect(everyMinutes(5)).toBe("rate(5 minutes)");
    expect(cronExpression("0", "12")).toBe("cron(0 12 * * ? *)");
    expect(atExpression("2026-01-01T00:00:00Z")).toBe("at(2026-01-01T00:00:00)");
    expect(scheduleTarget("arn", "role", { ok: true })).toMatchObject({ arn: "arn", roleArn: "role" });
  });

  it("wraps create failures in scheduler error", async () => {
    await expect(
      createSchedule({ name: "x", expression: everyMinutes(1), target: scheduleTarget("arn", "role") }, failingClient("AccessDeniedException"))
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
});
