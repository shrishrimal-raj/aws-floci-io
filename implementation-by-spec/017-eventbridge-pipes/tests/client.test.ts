import { describe, it, expect, vi } from "vitest";
import type { PipesClient } from "@aws-sdk/client-pipes";
import { client } from "../src/client.js";
import type { EventBridgePipesError } from "../src/errors.js";
import {
  createPipe,
  describePipe,
  estimatePipeMonthlyCost,
  pipeAuditEvent,
  pipeFailureAlarm,
  pipeLifecycleDecision,
  pipeName,
  redactPipeSpec,
  sqsToEventBusFilter,
  tenantEventFilter,
  withPipeRetry,
} from "../src/use-cases/pipes.js";

function failingClient(name: string): PipesClient {
  return { send: vi.fn(async () => { const error = new Error(`${name} failed`); error.name = name; throw error; }) } as unknown as PipesClient;
}

describe("EventBridge Pipes", () => {
  it("client is configured against Floci", () => expect(client).toBeDefined());
  it("supports local pure helpers", () => {
    expect(sqsToEventBusFilter("created")).toEqual({ body: { eventType: ["created"] } });
    expect(tenantEventFilter("tenant-a", ["created"])).toEqual({ body: { tenantId: ["tenant-a"], eventType: ["created"] } });
    expect(pipeName({ app: "orders", environment: "prod", source: "sqs", target: "bus" })).toBe("orders-prod-sqs-to-bus");
  });
  it("wraps primary failures", async () => {
    await expect(createPipe({ name: "p", sourceArn: "s", targetArn: "t", roleArn: "r" }, failingClient("AccessDeniedException"))).rejects.toMatchObject({ code: "EVENTBRIDGE_PIPES_AccessDeniedException", message: "EventBridge Pipes createPipe failed" } satisfies Partial<EventBridgePipesError>);
  });
  it("wraps secondary failures", async () => {
    await expect(describePipe("p", failingClient("ResourceNotFoundException"))).rejects.toMatchObject({ code: "EVENTBRIDGE_PIPES_ResourceNotFoundException", message: "EventBridge Pipes describePipe failed" } satisfies Partial<EventBridgePipesError>);
  });

  it("builds enterprise audit, redaction, lifecycle, cost, and alarms", () => {
    const spec = { name: "p", sourceArn: "s", targetArn: "t", roleArn: "r" };
    expect(redactPipeSpec(spec)).toMatchObject({ sourceArn: "[REDACTED]", roleArn: "[REDACTED]" });
    expect(pipeAuditEvent({ pipeName: "p", actor: "cicd", action: "create", outcome: "success" }, new Date("2026-01-01T00:00:00.000Z"))).toMatchObject({ at: "2026-01-01T00:00:00.000Z" });
    expect(pipeLifecycleDecision({ state: "RUNNING", lastEventAt: new Date("2026-01-01"), policy: { stopIfIdleAfterDays: 30, deleteIfStoppedAfterDays: 90 }, now: new Date("2026-05-30") })).toBe("stop");
    expect(estimatePipeMonthlyCost({ pipeCount: 1, monthlyRequests: 2_000_000 })).toBe(0.8);
    expect(pipeFailureAlarm("p")).toMatchObject({ metricName: "PipeDeliveryFailures", threshold: 1 });
  });

  it("retries transient failures", async () => {
    vi.useFakeTimers();
    let attempts = 0;
    const result = withPipeRetry(async () => {
      attempts += 1;
      if (attempts === 1) {
        const error = new Error("retry");
        error.name = "ThrottlingException";
        throw error;
      }
      return "ok";
    }, 2, 1);
    await vi.runAllTimersAsync();
    await expect(result).resolves.toBe("ok");
    vi.useRealTimers();
  });
});
