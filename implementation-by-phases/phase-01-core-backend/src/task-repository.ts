import { DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { type Task, type TaskStatus, fromItem, taskGsi1Pk, taskPk, taskSk, toItem } from "./taskflow-model.js";

export class TaskRepository {
  constructor(
    private readonly docClient: DynamoDBDocumentClient,
    private readonly tableName = process.env.TASKFLOW_TABLE ?? "taskflow"
  ) {}

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

  async get(tenantId: string, taskId: string): Promise<Task | undefined> {
    const result = await this.docClient.send(
      new GetCommand({ TableName: this.tableName, Key: { pk: taskPk(tenantId), sk: taskSk(taskId) } })
    );
    return result.Item ? fromItem(result.Item) : undefined;
  }

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
