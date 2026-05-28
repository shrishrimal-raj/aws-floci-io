import { describe, expect, it } from "vitest";
import { fromItem, taskGsi1Pk, taskPk, taskSk, toItem, type Task } from "../src/taskflow-model.js";

const task: Task = {
  tenantId: "tenant-a",
  taskId: "task-1",
  title: "Ship phase 01",
  status: "todo",
  attachmentKeys: [],
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("TaskFlow single-table design", () => {
  it("builds tenant partition and task sort keys", () => {
    expect(taskPk("tenant-a")).toBe("TENANT#tenant-a");
    expect(taskSk("task-1")).toBe("TASK#task-1");
    expect(taskGsi1Pk("todo")).toBe("STATUS#todo");
  });

  it("maps task domain object to DynamoDB item", () => {
    expect(toItem(task)).toMatchObject({
      pk: "TENANT#tenant-a",
      sk: "TASK#task-1",
      gsi1pk: "STATUS#todo",
      entityType: "Task",
      title: "Ship phase 01",
    });
  });

  it("round-trips from DynamoDB item", () => {
    expect(fromItem(toItem(task))).toEqual(task);
  });
});
