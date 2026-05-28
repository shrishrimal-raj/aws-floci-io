import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { createCoreClients } from "./core-clients.js";
import { TaskEventBus, taskCreatedEvent } from "./messaging.js";
import { newTask } from "./taskflow-model.js";
import { TaskRepository } from "./task-repository.js";

export interface ApiRequest {
  tenantId: string;
  method: "GET" | "POST" | "PATCH";
  path: string;
  body?: unknown;
}

export interface ApiResponse {
  statusCode: number;
  body: unknown;
}

export function createTaskFlowHandler() {
  const clients = createCoreClients();
  const repo = new TaskRepository(DynamoDBDocumentClient.from(clients.dynamodb));
  const events = new TaskEventBus(clients.sns);

  return async function handle(request: ApiRequest): Promise<ApiResponse> {
    if (request.method === "POST" && request.path === "/tasks") {
      const body = request.body as { title?: string; assigneeEmail?: string };
      if (!body?.title) return { statusCode: 400, body: { message: "title required" } };
      const task = newTask({ tenantId: request.tenantId, title: body.title, assigneeEmail: body.assigneeEmail });
      await repo.create(task);
      await events.publish(taskCreatedEvent(task));
      return { statusCode: 201, body: task };
    }

    if (request.method === "GET" && request.path === "/tasks") {
      return { statusCode: 200, body: await repo.listByTenant(request.tenantId) };
    }

    return { statusCode: 404, body: { message: "not found" } };
  };
}
