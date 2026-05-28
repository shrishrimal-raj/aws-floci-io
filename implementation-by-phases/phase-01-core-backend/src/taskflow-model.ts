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

export function taskPk(tenantId: string): string {
  return `TENANT#${tenantId}`;
}

export function taskSk(taskId: string): string {
  return `TASK#${taskId}`;
}

export function taskGsi1Pk(status: TaskStatus): string {
  return `STATUS#${status}`;
}

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
