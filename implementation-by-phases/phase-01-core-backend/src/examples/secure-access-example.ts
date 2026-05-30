import { createAuditEvent, assertTenantAccess, redactForLog, type EnterpriseRequestContext } from "../enterprise-patterns.js";
import { newTask } from "../taskflow-model.js";

/**
 * Real-world SaaS pattern: authorize tenant, create task object, emit safe audit payload.
 */
export function secureTaskCreationExample() {
  const context: EnterpriseRequestContext = {
    tenantId: "acme-prod",
    principalId: "user-42",
    requestId: "req-001",
    sourceIp: "203.0.113.10",
  };

  assertTenantAccess("acme-prod", context.tenantId);

  const task = newTask({ tenantId: context.tenantId, title: "Review SOC2 evidence", assigneeEmail: "audit@acme.example" });
  const audit = createAuditEvent(context, "Task.Create", `task/${task.taskId}`, "success", { title: task.title });

  return {
    task,
    cloudWatchLog: redactForLog({ ...audit, authorization: "Bearer example-token" }),
  };
}
