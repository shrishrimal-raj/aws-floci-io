export type TaskStatus = "todo" | "in_progress" | "done";

export interface TenantScoped {
  tenantId: string;
}

export interface Task extends TenantScoped {
  taskId: string;
  title: string;
  status: TaskStatus;
  assigneeEmail?: string;
  attachmentKeys: string[];
  createdAt: string;
  updatedAt: string;
}

export interface AttachmentUploadRequest extends TenantScoped {
  taskId: string;
  fileName: string;
  contentType: string;
}

/**
 * Builds DynamoDB partition key for all tenant-owned records.
 *
 * Example: `taskPk("tenant-a")` groups all tenant-a tasks for `/tasks` list queries and enforces tenant isolation.
 */
export function taskPk(tenantId: string): string {
  return `TENANT#${tenantId}`;
}

/**
 * Builds DynamoDB sort key for task entities.
 *
 * Example: `taskSk("task-123")` lets repository fetch one task with exact `(pk, sk)` lookup.
 */
export function taskSk(taskId: string): string {
  return `TASK#${taskId}`;
}

/**
 * Builds status GSI partition key for operational work queues and dashboards.
 *
 * Example: `taskGsi1Pk("in_progress")` returns all active tasks for manager dashboards.
 */
export function taskGsi1Pk(status: TaskStatus): string {
  return `STATUS#${status}`;
}

/**
 * Creates new domain task with safe defaults.
 *
 * Example: API handler calls this after validating request body so every task starts as `todo` with timestamps and empty attachments.
 */
export function newTask(input: Pick<Task, "tenantId" | "title" | "assigneeEmail">): Task {
  const now = new Date().toISOString();
  return {
    tenantId: input.tenantId,
    taskId: crypto.randomUUID(),
    title: input.title,
    status: "todo",
    assigneeEmail: input.assigneeEmail,
    attachmentKeys: [],
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Converts domain task to single-table DynamoDB item.
 *
 * Example: repository `create` persists returned object with condition expression to prevent duplicate task writes.
 */
export function toItem(task: Task): Record<string, unknown> {
  return {
    pk: taskPk(task.tenantId),
    sk: taskSk(task.taskId),
    gsi1pk: taskGsi1Pk(task.status),
    gsi1sk: task.updatedAt,
    entityType: "Task",
    ...task,
  };
}

/**
 * Converts DynamoDB item back to domain task.
 *
 * Example: list queries map raw items through this function before returning typed API responses.
 */
export function fromItem(item: Record<string, unknown>): Task {
  return {
    tenantId: String(item.tenantId),
    taskId: String(item.taskId),
    title: String(item.title),
    status: item.status as TaskStatus,
    assigneeEmail: item.assigneeEmail ? String(item.assigneeEmail) : undefined,
    attachmentKeys: Array.isArray(item.attachmentKeys) ? item.attachmentKeys.map(String) : [],
    createdAt: String(item.createdAt),
    updatedAt: String(item.updatedAt),
  };
}
