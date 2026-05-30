import { describe, expect, it, vi } from "vitest";
import type { EventBridgeClient } from "@aws-sdk/client-eventbridge";
import {
  archiveLifecyclePlan,
  assertTenantAccess,
  auditEvent,
  enterpriseEvent,
  estimatePutEventsCost,
  eventBridgeObservabilityPlan,
  publishEventsInBatches,
  retryWithBackoff,
  tenantEventPattern,
  type TenantActor,
} from "../src/index.js";

const actor: TenantActor = { tenantId: "tenant-a", principalId: "user-1", roles: ["publisher"], requestId: "req-1" };

function eventIdsClient(): EventBridgeClient {
  return {
    send: vi.fn(async (command: { input?: { Entries?: unknown[] } }) => ({ Entries: command.input?.Entries?.map((_, index) => ({ EventId: `evt-${index}` })) ?? [] })),
  } as unknown as EventBridgeClient;
}

describe("enterprise EventBridge patterns", () => {
  it("enforces tenant access", () => {
    expect(() => assertTenantAccess(actor, "tenant-a")).not.toThrow();
    expect(() => assertTenantAccess(actor, "tenant-b")).toThrow("tenant access denied");
    expect(() => assertTenantAccess({ ...actor, roles: ["reader"] }, "tenant-a")).toThrow("role access denied");
  });

  it("builds enterprise and audit envelopes", () => {
    const event = enterpriseEvent({ eventBusName: "orders", source: "app.orders", detailType: "order.created", tenantId: "tenant-a", producer: "checkout", detail: { orderId: "o1" }, eventId: "evt-1" });
    expect(event.detail).toMatchObject({ tenantId: "tenant-a", eventId: "evt-1", producer: "checkout", detail: { orderId: "o1" } });
    expect(auditEvent(actor, "audit", "orders.publish", "o1", "success").detail.detail).toMatchObject({ principalId: "user-1", outcome: "success" });
  });

  it("retries transient operations with deterministic backoff", async () => {
    let calls = 0;
    const delays: number[] = [];
    const result = await retryWithBackoff(
      async () => {
        calls++;
        if (calls < 3) throw new Error("ThrottlingException");
        return "ok";
      },
      { attempts: 3, baseDelayMs: 10, random: () => 0, sleep: async (ms) => { delays.push(ms); } }
    );
    expect(result).toBe("ok");
    expect(delays).toEqual([10, 20]);
  });

  it("publishes events in EventBridge-safe batches", async () => {
    const events = Array.from({ length: 12 }, (_, index) => ({ eventBusName: "bus", source: "app", detailType: "created", detail: { index } }));
    await expect(publishEventsInBatches(events, eventIdsClient())).resolves.toHaveLength(12);
    await expect(publishEventsInBatches(events, eventIdsClient(), 11)).rejects.toThrow("batchSize");
  });

  it("plans tenant patterns, archive lifecycle, observability, and cost", () => {
    expect(tenantEventPattern("app.orders", "order.created", "tenant-a")).toEqual({ source: ["app.orders"], "detail-type": ["order.created"], detail: { tenantId: ["tenant-a"] } });
    expect(archiveLifecyclePlan("bus", "archive", 365, 30)).toMatchObject({ retentionDays: 365, replayWindowDays: 30 });
    expect(eventBridgeObservabilityPlan("orders").alarms).toContain("orders-dlq-depth");
    expect(estimatePutEventsCost(25)).toEqual({ eventCount: 25, putEventsRequests: 3, estimatedPutEventsCostUsd: 0.000025 });
  });
});
