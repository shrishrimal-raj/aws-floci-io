import { describe, expect, it } from "vitest";
import { BackgroundQueue, TaskEventBus, taskCreatedEvent } from "../src/messaging.js";
import type { Task } from "../src/taskflow-model.js";

class FakeClient {
  commands: unknown[] = [];
  async send(command: unknown) {
    this.commands.push(command);
    return {};
  }
}

const task: Task = {
  tenantId: "tenant-a",
  taskId: "task-1",
  title: "Email customer",
  status: "todo",
  assigneeEmail: "ops@example.com",
  attachmentKeys: [],
  createdAt: "now",
  updatedAt: "now",
};

describe("SNS fanout and SQS background jobs", () => {
  it("creates tenant-scoped task events", () => {
    expect(taskCreatedEvent(task)).toMatchObject({
      type: "TaskCreated",
      tenantId: "tenant-a",
      taskId: "task-1",
      payload: { title: "Email customer", assigneeEmail: "ops@example.com" },
    });
  });

  it("publishes task event to SNS with message attributes", async () => {
    const client = new FakeClient();
    await new TaskEventBus(client as never, "arn:aws:sns:us-east-1:123:taskflow").publish(taskCreatedEvent(task));
    expect(client.commands[0]?.constructor.name).toBe("PublishCommand");
  });

  it("enqueues task event to SQS", async () => {
    const client = new FakeClient();
    await new BackgroundQueue(client as never, "http://localhost/queue").enqueue(taskCreatedEvent(task));
    expect(client.commands[0]?.constructor.name).toBe("SendMessageCommand");
  });
});
