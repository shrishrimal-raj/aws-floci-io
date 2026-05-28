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

export function taskCreatedEvent(task: Task): TaskEvent {
  return {
    type: "TaskCreated",
    tenantId: task.tenantId,
    taskId: task.taskId,
    occurredAt: new Date().toISOString(),
    payload: { title: task.title, assigneeEmail: task.assigneeEmail },
  };
}

export class TaskEventBus {
  constructor(private readonly sns: SNSClient, private readonly topicArn = process.env.TASKFLOW_TOPIC_ARN ?? "") {}

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
