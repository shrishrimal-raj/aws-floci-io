import { decideTaskLifecycle } from "../enterprise-patterns.js";
import type { Task } from "../taskflow-model.js";

/**
 * Real-world data lifecycle pattern: keep hot tasks cheap, archive older done work, delete expired records.
 */
export function lifecycleComplianceExample(tasks: Task[]) {
  const policy = { archiveDoneAfterDays: 90, deleteDoneAfterDays: 2555 };
  const now = new Date("2026-05-30T00:00:00.000Z");

  return tasks.map((task) => {
    const decision = decideTaskLifecycle(task, policy, now);
    return {
      tenantId: task.tenantId,
      taskId: task.taskId,
      status: task.status,
      decision,
      target:
        decision === "archive"
          ? "s3://taskflow-archive/done-tasks/"
          : decision === "delete"
            ? "dynamodb://taskflow/delete"
            : "dynamodb://taskflow",
    };
  });
}
