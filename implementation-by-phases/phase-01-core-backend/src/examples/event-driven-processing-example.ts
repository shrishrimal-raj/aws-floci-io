import { withRetry } from "../enterprise-patterns.js";
import { BackgroundQueue, TaskEventBus, taskCreatedEvent, taskStatusChangedEvent } from "../messaging.js";
import type { Task } from "../taskflow-model.js";

/** Minimal AWS-client-compatible fake for documentation and unit-style learning examples. */
class RecordingClient {
  readonly commands: string[] = [];
  async send(command: unknown) {
    this.commands.push(command?.constructor?.name ?? "UnknownCommand");
    return {};
  }
}

/**
 * Real-world event-driven pattern: SNS for fanout, SQS for retryable background work.
 */
export async function eventDrivenProcessingExample(task: Task) {
  const sns = new RecordingClient();
  const sqs = new RecordingClient();
  const eventBus = new TaskEventBus(sns as never, "arn:aws:sns:us-east-1:123456789012:taskflow-events");
  const queue = new BackgroundQueue(sqs as never, "http://localhost:4566/000000000000/taskflow-work");

  await withRetry(() => eventBus.publish(taskCreatedEvent(task)), { maxAttempts: 3, baseDelayMs: 25, maxDelayMs: 250 });
  await withRetry(() => queue.enqueue(taskStatusChangedEvent(task, "todo", "in_progress")), {
    maxAttempts: 3,
    baseDelayMs: 25,
    maxDelayMs: 250,
  });

  return { snsCommands: sns.commands, sqsCommands: sqs.commands };
}
