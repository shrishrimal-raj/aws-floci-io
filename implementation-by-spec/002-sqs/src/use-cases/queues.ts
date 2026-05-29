import {
  ChangeMessageVisibilityCommand,
  CreateQueueCommand,
  DeleteMessageCommand,
  DeleteQueueCommand,
  GetQueueAttributesCommand,
  GetQueueUrlCommand,
  PurgeQueueCommand,
  ReceiveMessageCommand,
  SendMessageBatchCommand,
  SendMessageCommand,
  type Message,
  type MessageAttributeValue,
  type QueueAttributeName,
  type SQSClient,
} from "@aws-sdk/client-sqs";
import { client as defaultClient } from "../client.js";
import { SQSError } from "../errors.js";

export interface CreateQueueInput {
  name: string;
  visibilityTimeoutSeconds?: number;
  messageRetentionSeconds?: number;
  receiveWaitTimeSeconds?: number;
  fifo?: boolean;
  contentBasedDeduplication?: boolean;
  redrivePolicy?: { deadLetterTargetArn: string; maxReceiveCount: number };
}

export interface QueuePair {
  queueUrl: string;
  deadLetterQueueUrl: string;
  deadLetterQueueArn: string;
}

export interface SendQueueMessageInput {
  queueUrl: string;
  body: string;
  delaySeconds?: number;
  groupId?: string;
  deduplicationId?: string;
  attributes?: Record<string, MessageAttributeValue>;
}

export interface ReceivedQueueMessage {
  id?: string;
  receiptHandle?: string;
  body?: string;
  attributes: Record<string, string>;
}

export interface QueueMessageEnvelope<TPayload> {
  type: string;
  payload: TPayload;
  traceId?: string;
  createdAt: string;
}

export interface ProcessOneMessageResult {
  processed: boolean;
  deleted: boolean;
  messageId?: string;
}

function awsErrorName(error: unknown): string {
  if (error instanceof SQSError && error.cause instanceof Error) return error.cause.name;
  return error instanceof Error ? error.name : "";
}

function wrapError(operation: string, error: unknown): never {
  const code = awsErrorName(error) || "UNKNOWN";
  throw new SQSError(code, `SQS ${operation} failed`, error);
}

function toAttributes(input: CreateQueueInput): Record<string, string> {
  const attributes: Record<string, string> = {};
  if (input.visibilityTimeoutSeconds !== undefined) {
    attributes.VisibilityTimeout = String(input.visibilityTimeoutSeconds);
  }
  if (input.messageRetentionSeconds !== undefined) {
    attributes.MessageRetentionPeriod = String(input.messageRetentionSeconds);
  }
  if (input.receiveWaitTimeSeconds !== undefined) {
    attributes.ReceiveMessageWaitTimeSeconds = String(input.receiveWaitTimeSeconds);
  }
  if (input.fifo) {
    attributes.FifoQueue = "true";
    attributes.ContentBasedDeduplication = String(input.contentBasedDeduplication ?? true);
  }
  if (input.redrivePolicy) {
    attributes.RedrivePolicy = JSON.stringify({
      deadLetterTargetArn: input.redrivePolicy.deadLetterTargetArn,
      maxReceiveCount: input.redrivePolicy.maxReceiveCount,
    });
  }
  return attributes;
}

function toReceived(message: Message): ReceivedQueueMessage {
  return {
    id: message.MessageId,
    receiptHandle: message.ReceiptHandle,
    body: message.Body,
    attributes: message.Attributes ?? {},
  };
}

/**
 * Create a standard or FIFO queue with production attributes.
 *
 * @example
 * const queueUrl = await createQueue({ name: "orders", receiveWaitTimeSeconds: 10 });
 */
export async function createQueue(input: CreateQueueInput, sqs: SQSClient = defaultClient): Promise<string> {
  try {
    const result = await sqs.send(
      new CreateQueueCommand({ QueueName: input.name, Attributes: toAttributes(input) })
    );
    if (!result.QueueUrl) throw new Error("CreateQueue returned no QueueUrl");
    return result.QueueUrl;
  } catch (error) {
    wrapError("createQueue", error);
  }
}

/**
 * Resolve a queue URL by name; returns undefined when missing.
 *
 * @example
 * const queueUrl = await getQueueUrl("orders");
 */
export async function getQueueUrl(name: string, sqs: SQSClient = defaultClient): Promise<string | undefined> {
  try {
    const result = await sqs.send(new GetQueueUrlCommand({ QueueName: name }));
    return result.QueueUrl;
  } catch (error) {
    if (awsErrorName(error) === "QueueDoesNotExist") return undefined;
    wrapError("getQueueUrl", error);
  }
}

/**
 * Read a queue ARN for IAM policies and DLQ redrive policies.
 *
 * @example
 * const arn = await getQueueArn(queueUrl);
 */
export async function getQueueArn(queueUrl: string, sqs: SQSClient = defaultClient): Promise<string> {
  try {
    const result = await sqs.send(
      new GetQueueAttributesCommand({ QueueUrl: queueUrl, AttributeNames: ["QueueArn"] })
    );
    const arn = result.Attributes?.QueueArn;
    if (!arn) throw new Error("QueueArn missing");
    return arn;
  } catch (error) {
    wrapError("getQueueArn", error);
  }
}

/**
 * Create a main queue plus dead-letter queue and wire redrive policy.
 *
 * @example
 * const pair = await createQueueWithDlq("orders", 3);
 */
export async function createQueueWithDlq(
  name: string,
  maxReceiveCount = 3,
  sqs: SQSClient = defaultClient
): Promise<QueuePair> {
  const deadLetterQueueUrl = await createQueue({ name: `${name}-dlq` }, sqs);
  const deadLetterQueueArn = await getQueueArn(deadLetterQueueUrl, sqs);
  const queueUrl = await createQueue(
    { name, redrivePolicy: { deadLetterTargetArn: deadLetterQueueArn, maxReceiveCount } },
    sqs
  );
  return { queueUrl, deadLetterQueueUrl, deadLetterQueueArn };
}

/**
 * Send one message, including FIFO group/deduplication fields when needed.
 *
 * @example
 * await sendMessage({ queueUrl, body: JSON.stringify({ orderId: "o1" }) });
 */
export async function sendMessage(input: SendQueueMessageInput, sqs: SQSClient = defaultClient): Promise<string> {
  try {
    const result = await sqs.send(
      new SendMessageCommand({
        QueueUrl: input.queueUrl,
        MessageBody: input.body,
        DelaySeconds: input.delaySeconds,
        MessageGroupId: input.groupId,
        MessageDeduplicationId: input.deduplicationId,
        MessageAttributes: input.attributes,
      })
    );
    if (!result.MessageId) throw new Error("SendMessage returned no MessageId");
    return result.MessageId;
  } catch (error) {
    wrapError("sendMessage", error);
  }
}

/**
 * Send typed JSON payload wrapped in a backend event envelope.
 *
 * @example
 * await sendJsonMessage(queueUrl, "order.created", { orderId: "o1" }, "trace-1");
 */
export async function sendJsonMessage<TPayload>(
  queueUrl: string,
  type: string,
  payload: TPayload,
  traceId?: string,
  sqs: SQSClient = defaultClient
): Promise<string> {
  const envelope: QueueMessageEnvelope<TPayload> = {
    type,
    payload,
    traceId,
    createdAt: new Date().toISOString(),
  };

  return sendMessage(
    {
      queueUrl,
      body: JSON.stringify(envelope),
      attributes: {
        eventType: { DataType: "String", StringValue: type },
        ...(traceId && { traceId: { DataType: "String", StringValue: traceId } }),
      },
    },
    sqs
  );
}

/**
 * Send a FIFO message with stable group and deduplication IDs.
 *
 * @example
 * await sendFifoMessage(fifoQueueUrl, "customer-1", "order-1", { orderId: "o1" });
 */
export async function sendFifoMessage<TPayload>(
  queueUrl: string,
  groupId: string,
  deduplicationId: string,
  payload: TPayload,
  sqs: SQSClient = defaultClient
): Promise<string> {
  return sendMessage(
    {
      queueUrl,
      body: JSON.stringify(payload),
      groupId,
      deduplicationId,
    },
    sqs
  );
}

/**
 * Send up to 10 messages in one batch request.
 *
 * @example
 * const ids = await sendMessageBatch(queueUrl, ["one", "two"]);
 */
export async function sendMessageBatch(
  queueUrl: string,
  bodies: string[],
  sqs: SQSClient = defaultClient
): Promise<string[]> {
  try {
    const result = await sqs.send(
      new SendMessageBatchCommand({
        QueueUrl: queueUrl,
        Entries: bodies.map((body, index) => ({ Id: String(index), MessageBody: body })),
      })
    );
    return result.Successful?.map((entry) => entry.MessageId).filter((id): id is string => Boolean(id)) ?? [];
  } catch (error) {
    wrapError("sendMessageBatch", error);
  }
}

/**
 * Long-poll messages and include system/message attributes.
 *
 * @example
 * const messages = await receiveMessages(queueUrl, 10, 5);
 */
export async function receiveMessages(
  queueUrl: string,
  maxMessages = 1,
  waitTimeSeconds = 1,
  sqs: SQSClient = defaultClient
): Promise<ReceivedQueueMessage[]> {
  try {
    const result = await sqs.send(
      new ReceiveMessageCommand({
        QueueUrl: queueUrl,
        MaxNumberOfMessages: maxMessages,
        WaitTimeSeconds: waitTimeSeconds,
        AttributeNames: ["All"],
        MessageAttributeNames: ["All"],
      })
    );
    return result.Messages?.map(toReceived) ?? [];
  } catch (error) {
    wrapError("receiveMessages", error);
  }
}

/**
 * Delete a processed message by receipt handle.
 *
 * @example
 * await deleteMessage(queueUrl, message.receiptHandle);
 */
export async function deleteMessage(
  queueUrl: string,
  receiptHandle: string,
  sqs: SQSClient = defaultClient
): Promise<void> {
  try {
    await sqs.send(new DeleteMessageCommand({ QueueUrl: queueUrl, ReceiptHandle: receiptHandle }));
  } catch (error) {
    wrapError("deleteMessage", error);
  }
}

/**
 * Extend or shorten invisibility window while a worker processes a message.
 *
 * @example
 * await changeMessageVisibility(queueUrl, message.receiptHandle, 60);
 */
export async function changeMessageVisibility(
  queueUrl: string,
  receiptHandle: string,
  visibilityTimeoutSeconds: number,
  sqs: SQSClient = defaultClient
): Promise<void> {
  try {
    await sqs.send(
      new ChangeMessageVisibilityCommand({
        QueueUrl: queueUrl,
        ReceiptHandle: receiptHandle,
        VisibilityTimeout: visibilityTimeoutSeconds,
      })
    );
  } catch (error) {
    wrapError("changeMessageVisibility", error);
  }
}

/**
 * Process one message and delete it only after handler succeeds.
 *
 * @example
 * await processOneMessage(queueUrl, async (message) => console.log(message.body));
 */
export async function processOneMessage(
  queueUrl: string,
  handler: (message: ReceivedQueueMessage) => Promise<void>,
  sqs: SQSClient = defaultClient
): Promise<ProcessOneMessageResult> {
  const [message] = await receiveMessages(queueUrl, 1, 1, sqs);
  if (!message) return { processed: false, deleted: false };

  await handler(message);

  if (message.receiptHandle) {
    await deleteMessage(queueUrl, message.receiptHandle, sqs);
    return { processed: true, deleted: true, messageId: message.id };
  }

  return { processed: true, deleted: false, messageId: message.id };
}

/**
 * Read approximate visible, in-flight, and delayed message counts.
 *
 * @example
 * const counts = await getApproximateQueueCounts(queueUrl);
 */
export async function getApproximateQueueCounts(
  queueUrl: string,
  sqs: SQSClient = defaultClient
): Promise<{ visible: number; notVisible: number; delayed: number }> {
  try {
    const names: QueueAttributeName[] = [
      "ApproximateNumberOfMessages",
      "ApproximateNumberOfMessagesNotVisible",
      "ApproximateNumberOfMessagesDelayed",
    ];
    const result = await sqs.send(new GetQueueAttributesCommand({ QueueUrl: queueUrl, AttributeNames: names }));
    return {
      visible: Number(result.Attributes?.ApproximateNumberOfMessages ?? 0),
      notVisible: Number(result.Attributes?.ApproximateNumberOfMessagesNotVisible ?? 0),
      delayed: Number(result.Attributes?.ApproximateNumberOfMessagesDelayed ?? 0),
    };
  } catch (error) {
    wrapError("getApproximateQueueCounts", error);
  }
}

/**
 * Remove all available messages from a queue.
 *
 * @example
 * await purgeQueue(queueUrl);
 */
export async function purgeQueue(queueUrl: string, sqs: SQSClient = defaultClient): Promise<void> {
  try {
    await sqs.send(new PurgeQueueCommand({ QueueUrl: queueUrl }));
  } catch (error) {
    wrapError("purgeQueue", error);
  }
}

/**
 * Delete a queue; undefined or already-deleted queues are treated as cleaned up.
 *
 * @example
 * await deleteQueue(queueUrl);
 */
export async function deleteQueue(queueUrl: string | undefined, sqs: SQSClient = defaultClient): Promise<void> {
  if (!queueUrl) return;
  try {
    await sqs.send(new DeleteQueueCommand({ QueueUrl: queueUrl }));
  } catch (error) {
    if (awsErrorName(error) === "QueueDoesNotExist") return;
    wrapError("deleteQueue", error);
  }
}
