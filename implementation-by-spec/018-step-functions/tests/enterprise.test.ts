import { describe, expect, it, vi } from "vitest";
import type { SFNClient } from "@aws-sdk/client-sfn";
import {
  assertWorkflowAccess,
  choiceState,
  estimateStandardWorkflowCost,
  lambdaTaskState,
  orderProcessingStateMachine,
  retryWithBackoff,
  startEnterpriseExecution,
  workflowAuditRecord,
  workflowComplianceControls,
  workflowDisasterRecoveryPlan,
  workflowInput,
  workflowLifecyclePlan,
  workflowObservabilityPlan,
  type WorkflowActor,
} from "../src/index.js";

const actor: WorkflowActor = { tenantId: "tenant-a", principalId: "user-1", roles: ["workflow:start"], requestId: "req-1" };

function startClient(): SFNClient {
  return { send: vi.fn(async () => ({ executionArn: "arn:aws:states:us-east-1:000000000000:execution:orders:e1" })) } as unknown as SFNClient;
}

describe("enterprise Step Functions patterns", () => {
  it("enforces tenant and role workflow access", () => {
    expect(() => assertWorkflowAccess(actor, "tenant-a")).not.toThrow();
    expect(() => assertWorkflowAccess(actor, "tenant-b")).toThrow("tenant access denied");
    expect(() => assertWorkflowAccess({ ...actor, roles: ["reader"] }, "tenant-a")).toThrow("role access denied");
  });

  it("builds workflow input and audit records", () => {
    const input = workflowInput({ tenantId: "tenant-a", workflowName: "orders", payload: { orderId: "o1" }, correlationId: "corr-1" });
    expect(input).toMatchObject({ correlationId: "corr-1", idempotencyKey: "corr-1", schemaVersion: "1.0" });
    expect(workflowAuditRecord(actor, "orders", "workflow.start", "attempt", input.correlationId)).toMatchObject({ principalId: "user-1", outcome: "attempt" });
  });

  it("builds ASL task, choice, and order processing definitions", () => {
    expect(lambdaTaskState({ name: "payment", functionArn: "fn", catchNext: "Compensate", end: true })).toMatchObject({ Type: "Task", Catch: [{ Next: "Compensate" }] });
    expect(choiceState([{ variable: "$.type", stringEquals: "vip", next: "Review" }], "Process")).toMatchObject({ Type: "Choice", Default: "Process" });
    const definition = JSON.parse(orderProcessingStateMachine({ validateArn: "v", paymentArn: "p", fulfillmentArn: "f", auditArn: "a", compensateArn: "c" }));
    expect(definition.States).toHaveProperty("CompensateOrder");
  });

  it("retries transient starts and starts enterprise execution", async () => {
    let calls = 0;
    const delays: number[] = [];
    await expect(
      retryWithBackoff(
        async () => {
          calls++;
          if (calls < 3) throw new Error("ThrottlingException");
          return "ok";
        },
        { attempts: 3, baseDelayMs: 10, random: () => 0, sleep: async (ms) => { delays.push(ms); } }
      )
    ).resolves.toBe("ok");
    expect(delays).toEqual([10, 20]);

    await expect(startEnterpriseExecution(actor, "arn:machine", { tenantId: "tenant-a", workflowName: "orders", payload: { orderId: "o1" } }, startClient())).resolves.toMatchObject({ executionArn: "arn:aws:states:us-east-1:000000000000:execution:orders:e1" });
  });

  it("plans observability, cost, lifecycle, DR, and compliance", () => {
    expect(workflowObservabilityPlan("orders").alarms).toContain("orders-failed-executions");
    expect(estimateStandardWorkflowCost(1000, 10)).toEqual({ executions: 1000, averageTransitions: 10, totalTransitions: 10000, estimatedStandardCostUsd: 0.25 });
    expect(workflowLifecyclePlan("orders")).toMatchObject({ executionHistoryRetentionDays: 90, piiRedactionRequired: true });
    expect(workflowDisasterRecoveryPlan("orders")).toMatchObject({ strategy: "cross-region-standby", rpoMinutes: 15 });
    expect(workflowComplianceControls("SOC2").map((control) => control.control)).toContain("Auditability");
  });
});
