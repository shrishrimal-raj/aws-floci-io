import { fileURLToPath } from "node:url";
import { secureTaskCreationExample } from "../../../../src/examples/secure-access-example.js";
import { eventDrivenProcessingExample } from "../../../../src/examples/event-driven-processing-example.js";
import { lifecycleComplianceExample } from "../../../../src/examples/lifecycle-compliance-example.js";

/**
 * End-to-end enterprise learning scenario:
 * 1. enforce tenant boundary
 * 2. build audit-safe task payload
 * 3. publish domain events with retries
 * 4. classify completed work for archive/delete lifecycle
 */
export async function enterpriseSaasWorkflowScenario() {
  const created = secureTaskCreationExample();
  const events = await eventDrivenProcessingExample(created.task);
  const lifecycle = lifecycleComplianceExample([
    created.task,
    { ...created.task, taskId: "old-done", status: "done", updatedAt: "2018-01-01T00:00:00.000Z" },
  ]);

  return {
    createdTaskId: created.task.taskId,
    auditLog: created.cloudWatchLog,
    events,
    lifecycle,
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  console.log(JSON.stringify(await enterpriseSaasWorkflowScenario(), null, 2));
}
