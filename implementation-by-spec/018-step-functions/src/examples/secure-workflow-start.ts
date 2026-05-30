#!/usr/bin/env tsx
import { startEnterpriseExecution, workflowAuditRecord, workflowInput, type WorkflowActor } from "../index.js";

const actor: WorkflowActor = {
  tenantId: "tenant-a",
  principalId: "user-123",
  roles: ["workflow:start"],
  requestId: "req-001",
};

const input = workflowInput({
  tenantId: actor.tenantId,
  workflowName: "order-processing",
  correlationId: actor.requestId,
  payload: { orderId: "o-100", amountCents: 12_900 },
});

console.log("secure workflow input", input);
console.log("audit attempt", workflowAuditRecord(actor, "order-processing", "workflow.start", "attempt", input.correlationId));

// Real start path when state machine ARN exists:
// await startEnterpriseExecution(actor, process.env.STATE_MACHINE_ARN!, input);
await Promise.resolve(startEnterpriseExecution.name);
