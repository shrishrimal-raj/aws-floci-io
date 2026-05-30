import { DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { type Task, type TaskStatus, fromItem, taskGsi1Pk, taskPk, taskSk, toItem } from "./taskflow-model.js";

export class TaskRepository {
  constructor(
    private readonly docClient: DynamoDBDocumentClient,
    private readonly tableName = process.env.TASKFLOW_TABLE ?? "taskflow"
  ) {}

  /**
   * Creates task with idempotency-safe conditional write.
   *
   * Example: API `POST /tasks` calls this before publishing SNS event; duplicate task IDs fail instead of overwriting tenant data.
   */
  async create(task: Task): Promise<Task> {
    await this.docClient.send(
      new PutCommand({
        TableName: this.tableName,
        Item: toItem(task),
        ConditionExpression: "attribute_not_exists(pk) AND attribute_not_exists(sk)",
      })
    );
    return task;
  }

  /**
   * Reads one task by tenant and task ID.
   *
   * Example: `GET /tasks/{taskId}` first validates tenant access, then calls this exact-key lookup for low latency.
   */
  async get(tenantId: string, taskId: string): Promise<Task | undefined> {
    const result = await this.docClient.send(
      new GetCommand({ TableName: this.tableName, Key: { pk: taskPk(tenantId), sk: taskSk(taskId) } })
    );
    return result.Item ? fromItem(result.Item) : undefined;
  }

  /**
   * Lists all tasks owned by one tenant.
   *
   * Example: SaaS dashboard calls this to show only customer-local data under `TENANT#customer-id` partition.
   */
  async listByTenant(tenantId: string): Promise<Task[]> {
    const result = await this.docClient.send(
      new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: "pk = :pk AND begins_with(sk, :prefix)",
        ExpressionAttributeValues: { ":pk": taskPk(tenantId), ":prefix": "TASK#" },
      })
    );
    return (result.Items ?? []).map(fromItem);
  }

  /**
   * Lists tasks by workflow state through GSI.
   *
   * Example: operations team queries `in_progress` tasks across tenants for backlog monitoring and SLA reports.
   */
  async listByStatus(status: TaskStatus): Promise<Task[]> {
    const result = await this.docClient.send(
      new QueryCommand({
        TableName: this.tableName,
        IndexName: "gsi1",
        KeyConditionExpression: "gsi1pk = :pk",
        ExpressionAttributeValues: { ":pk": taskGsi1Pk(status) },
      })
    );
    return (result.Items ?? []).map(fromItem);
  }

  /**
   * Updates status and keeps GSI projection current.
   *
   * Example: background worker marks task `done`; reporting query immediately moves it from `in_progress` to `done` index bucket.
   */
  async markStatus(tenantId: string, taskId: string, status: TaskStatus): Promise<void> {
    const updatedAt = new Date().toISOString();
    await this.docClient.send(
      new UpdateCommand({
        TableName: this.tableName,
        Key: { pk: taskPk(tenantId), sk: taskSk(taskId) },
        UpdateExpression: "SET #status = :status, gsi1pk = :gsi1pk, updatedAt = :updatedAt",
        ExpressionAttributeNames: { "#status": "status" },
        ExpressionAttributeValues: { ":status": status, ":gsi1pk": taskGsi1Pk(status), ":updatedAt": updatedAt },
        ConditionExpression: "attribute_exists(pk)",
      })
    );
  }
}
