import { PublishCommand, type SNSClient } from "@aws-sdk/client-sns";
import { SendMessageCommand, type SQSClient } from "@aws-sdk/client-sqs";
import type { Task } from "./taskflow-model.js";

export interface TaskEvent {
  type: "TaskCreated" | "TaskStatusChanged";
  tenantId: string;
  taskId: string;
  occurredAt: string;
  payload: Record<string, unknown>;
}

/**
 * Builds canonical domain event for new task creation.
 *
 * Example: after DynamoDB `PutItem`, publish this to SNS so email, analytics, and search-index workers react without coupling to API code.
 */
export function taskCreatedEvent(task: Task): TaskEvent {
  return {
    type: "TaskCreated",
    tenantId: task.tenantId,
    taskId: task.taskId,
    occurredAt: new Date().toISOString(),
    payload: { title: task.title, assigneeEmail: task.assigneeEmail },
  };
}

/**
 * Builds canonical domain event when workflow state changes.
 *
 * Example: emit after `markStatus(..., "done")` so billing, reporting, and notification consumers receive same tenant-scoped envelope.
 */
export function taskStatusChangedEvent(
  task: Task,
  previousStatus: Task["status"],
  nextStatus: Task["status"]
): TaskEvent {
  return {
    type: "TaskStatusChanged",
    tenantId: task.tenantId,
    taskId: task.taskId,
    occurredAt: new Date().toISOString(),
    payload: { previousStatus, nextStatus },
  };
}

export class TaskEventBus {
  constructor(private readonly sns: SNSClient, private readonly topicArn = process.env.TASKFLOW_TOPIC_ARN ?? "") {}

  /**
   * Publishes tenant-scoped event to SNS with filterable attributes.
   *
   * Example: subscribers can filter `eventType = TaskCreated` or `tenantId = tenant-a` for low-cost fanout routing.
   */
  async publish(event: TaskEvent): Promise<void> {
    await this.sns.send(
      new PublishCommand({
        TopicArn: this.topicArn,
        Message: JSON.stringify(event),
        MessageAttributes: {
          tenantId: { DataType: "String", StringValue: event.tenantId },
          eventType: { DataType: "String", StringValue: event.type },
        },
      })
    );
  }
}

export class BackgroundQueue {
  constructor(private readonly sqs: SQSClient, private readonly queueUrl = process.env.TASKFLOW_QUEUE_URL ?? "") {}

  /**
   * Enqueues event for async work that can retry independently from user request.
   *
   * Example: queue attachment virus-scan or CRM sync jobs; configure SQS redrive policy in service lab for DLQ handling.
   */
  async enqueue(event: TaskEvent): Promise<void> {
    await this.sqs.send(
      new SendMessageCommand({
        QueueUrl: this.queueUrl,
        MessageBody: JSON.stringify(event),
        MessageAttributes: {
          tenantId: { DataType: "String", StringValue: event.tenantId },
          eventType: { DataType: "String", StringValue: event.type },
        },
      })
    );
  }
}
