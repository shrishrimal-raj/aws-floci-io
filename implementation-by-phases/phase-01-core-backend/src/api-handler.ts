import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { CloudWatchJsonLogger } from "./config-secrets-logs.js";
import { createCoreClients } from "./core-clients.js";
import { createAuditEvent, redactForLog, withRetry, type EnterpriseRequestContext } from "./enterprise-patterns.js";
import { TaskEventBus, taskCreatedEvent } from "./messaging.js";
import { newTask } from "./taskflow-model.js";
import { TaskRepository } from "./task-repository.js";

export interface ApiRequest {
  tenantId: string;
  method: "GET" | "POST" | "PATCH";
  path: string;
  body?: unknown;
  requestId?: string;
  principalId?: string;
}

export interface ApiResponse {
  statusCode: number;
  body: unknown;
}

/**
 * Creates Lambda/API Gateway-compatible TaskFlow handler with DynamoDB persistence and SNS fanout.
 *
 * Example: deploy behind API Gateway v2; `POST /tasks` creates task, publishes `TaskCreated`, logs audit-safe event, and returns HTTP 201.
 */
export function createTaskFlowHandler() {
  const clients = createCoreClients();
  const repo = new TaskRepository(DynamoDBDocumentClient.from(clients.dynamodb));
  const events = new TaskEventBus(clients.sns);
  const logger = new CloudWatchJsonLogger(clients.cloudWatchLogs);

  return async function handle(request: ApiRequest): Promise<ApiResponse> {
    const context: EnterpriseRequestContext = {
      tenantId: request.tenantId,
      principalId: request.principalId ?? "anonymous",
      requestId: request.requestId ?? crypto.randomUUID(),
    };

    if (request.method === "POST" && request.path === "/tasks") {
      const body = request.body as { title?: string; assigneeEmail?: string };
      if (!body?.title) return { statusCode: 400, body: { message: "title required" } };
      const task = newTask({ tenantId: request.tenantId, title: body.title, assigneeEmail: body.assigneeEmail });
      await repo.create(task);
      await withRetry(() => events.publish(taskCreatedEvent(task)), { maxAttempts: 3, baseDelayMs: 50, maxDelayMs: 500 });
      await safeAuditLog(logger, {
        tenantId: request.tenantId,
        requestId: context.requestId,
        level: "info",
        message: "task created",
        data: redactForLog({ ...createAuditEvent(context, "Task.Create", `task/${task.taskId}`, "success") }),
      });
      return { statusCode: 201, body: task };
    }

    if (request.method === "GET" && request.path === "/tasks") {
      return { statusCode: 200, body: await repo.listByTenant(request.tenantId) };
    }

    return { statusCode: 404, body: { message: "not found" } };
  };
}

/**
 * Writes audit log without breaking user request when logging infrastructure is unavailable.
 *
 * Example: if CloudWatch stream is missing during local Floci learning, task creation still succeeds and warning stays local.
 */
async function safeAuditLog(logger: CloudWatchJsonLogger, event: Parameters<CloudWatchJsonLogger["put"]>[0]): Promise<void> {
  try {
    await logger.put(event);
  } catch (error) {
    console.warn("audit log write failed", error instanceof Error ? error.message : error);
  }
}
