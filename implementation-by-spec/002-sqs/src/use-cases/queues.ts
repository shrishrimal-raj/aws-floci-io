import {
  AddPermissionCommand,
  ChangeMessageVisibilityCommand,
  CreateQueueCommand,
  DeleteMessageBatchCommand,
  DeleteMessageCommand,
  DeleteQueueCommand,
  GetQueueAttributesCommand,
  GetQueueUrlCommand,
  ListDeadLetterSourceQueuesCommand,
  ListMessageMoveTasksCommand,
  ListQueueTagsCommand,
  ListQueuesCommand,
  PurgeQueueCommand,
  ReceiveMessageCommand,
  RemovePermissionCommand,
  SendMessageBatchCommand,
  SendMessageCommand,
  SetQueueAttributesCommand,
  StartMessageMoveTaskCommand,
  TagQueueCommand,
  UntagQueueCommand,
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
  kmsMasterKeyId?: string;
  kmsDataKeyReusePeriodSeconds?: number;
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

export interface ProcessMessagesResult {
  received: number;
  processed: number;
  deleted: number;
  failed: number;
}

export interface QueueAuditEvent {
  eventId: string;
  timestamp: string;
  queueUrl: string;
  messageId?: string;
  action: string;
  outcome: "SUCCESS" | "RETRY" | "DLQ" | "ERROR";
  traceId?: string;
  tenantId?: string;
  reason?: string;
}

export interface QueueMetricsSnapshot {
  queueUrl: string;
  visible: number;
  notVisible: number;
  delayed: number;
  backlog: number;
  alarmHints: string[];
}

export interface SqsRequestCostEstimateInput {
  requests: number;
  freeTierRequests?: number;
  usdPerMillionRequests?: number;
}

export interface SqsRequestCostEstimate {
  billableRequests: number;
  requestUsd: number;
}

export interface QueueTagInput {
  tenantId?: string;
  environment?: string;
  costCenter?: string;
  dataClassification?: string;
  owner?: string;
}

export interface SqsAlarmConfig {
  name: string;
  metric: string;
  threshold: number;
  comparison: string;
  evaluationPeriods: number;
  action: string;
}

function awsErrorName(error: unknown): string {
  if (error instanceof SQSError && error.cause instanceof Error) {
    return error.cause.name;
  }

  return error instanceof Error ? error.name : "";
}

function wrapError(operation: string, error: unknown): never {
  const code = awsErrorName(error) || "UNKNOWN";
  throw new SQSError(code, `SQS ${operation} failed`, error);
}

export function tagInputToRecord(input: QueueTagInput): Record<string, string> {
  const tags: Record<string, string> = {};

  if (input.tenantId) tags.TenantId = input.tenantId;
  if (input.environment) tags.Environment = input.environment;
  if (input.costCenter) tags.CostCenter = input.costCenter;
  if (input.dataClassification) {
    tags.DataClassification = input.dataClassification;
  }
  if (input.owner) tags.Owner = input.owner;

  return tags;
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

  if (input.kmsMasterKeyId !== undefined) {
    attributes.KmsMasterKeyId = input.kmsMasterKeyId;
  }

  if (input.kmsDataKeyReusePeriodSeconds !== undefined) {
    attributes.KmsDataKeyReusePeriodSeconds = String(input.kmsDataKeyReusePeriodSeconds);
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

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

/**
 * Parse and validate a JSON queue envelope produced by sendJsonMessage.
 *
 * @example
 * const envelope = parseJsonEnvelope<{ orderId: string }>(message.body);
 */
export function parseJsonEnvelope<TPayload>(body: string | undefined): QueueMessageEnvelope<TPayload> {
  if (!body) {
    throw new SQSError("VALIDATION", "message body is required");
  }

  const value = JSON.parse(body) as Partial<QueueMessageEnvelope<TPayload>>;

  if (!value.type || !value.createdAt || value.payload === undefined) {
    throw new SQSError("VALIDATION", "message body is not a QueueMessageEnvelope");
  }

  return value as QueueMessageEnvelope<TPayload>;
}

/**
 * Build a stable idempotency key for duplicate-safe workers.
 * Prefer domain IDs; fall back to message ID only when no domain key exists.
 *
 * @example
 * const key = messageIdempotencyKey("order.created", "tenant-a", "order-1");
 */
export function messageIdempotencyKey(type: string, tenantId: string, domainId: string): string {
  return ["sqs", type, tenantId, domainId].map((part) => part.trim().replace(/[^a-zA-Z0-9._:-]+/g, "-")).join("#");
}

/**
 * Build a structured audit event for queue processing logs or an audit topic.
 *
 * @example
 * const audit = createQueueAuditEvent({
 *   queueUrl,
 *   action: "OrderProcessed",
 *   outcome: "SUCCESS",
 * });
 */
export function createQueueAuditEvent(input: Omit<QueueAuditEvent, "eventId" | "timestamp">): QueueAuditEvent {
  return {
    eventId: `sqs-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    timestamp: new Date().toISOString(),
    ...input,
  };
}

/**
 * Estimate SQS API request cost.
 * Defaults are illustrative; verify live AWS Pricing before production use.
 *
 * @example
 * estimateSqsRequestCost({ requests: 25_000_000 });
 */
export function estimateSqsRequestCost(input: SqsRequestCostEstimateInput): SqsRequestCostEstimate {
  const billableRequests = Math.max(0, input.requests - (input.freeTierRequests ?? 1_000_000));

  const requestUsd = (billableRequests / 1_000_000) * (input.usdPerMillionRequests ?? 0.4);

  return { billableRequests, requestUsd };
}

/**
 * Create a standard or FIFO queue with production attributes.
 *
 * @example
 * const queueUrl = await createQueue({
 *   name: "orders",
 *   receiveWaitTimeSeconds: 10,
 * });
 */
export async function createQueue(input: CreateQueueInput, sqs: SQSClient = defaultClient): Promise<string> {
  try {
    const result = await sqs.send(
      new CreateQueueCommand({
        QueueName: input.name,
        Attributes: toAttributes(input),
      }),
    );

    if (!result.QueueUrl) {
      throw new Error("CreateQueue returned no QueueUrl");
    }

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
    if (awsErrorName(error) === "QueueDoesNotExist") {
      return undefined;
    }

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
      new GetQueueAttributesCommand({
        QueueUrl: queueUrl,
        AttributeNames: ["QueueArn"],
      }),
    );

    const arn = result.Attributes?.QueueArn;

    if (!arn) {
      throw new Error("QueueArn missing");
    }

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
export async function createQueueWithDlq(name: string, maxReceiveCount = 3, sqs: SQSClient = defaultClient): Promise<QueuePair> {
  const isFifo = name.endsWith(".fifo");
  const deadLetterQueueName = isFifo ? name.replace(/\.fifo$/, "-dlq.fifo") : `${name}-dlq`;

  const deadLetterQueueUrl = await createQueue(
    {
      name: deadLetterQueueName,
      fifo: isFifo,
    },
    sqs,
  );

  const deadLetterQueueArn = await getQueueArn(deadLetterQueueUrl, sqs);

  const queueUrl = await createQueue(
    {
      name,
      fifo: isFifo,
      redrivePolicy: {
        deadLetterTargetArn: deadLetterQueueArn,
        maxReceiveCount,
      },
    },
    sqs,
  );

  return { queueUrl, deadLetterQueueUrl, deadLetterQueueArn };
}

/**
 * Send one message, including FIFO group/deduplication fields when needed.
 *
 * @example
 * await sendMessage({
 *   queueUrl,
 *   body: JSON.stringify({ orderId: "o1" }),
 * });
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
      }),
    );

    if (!result.MessageId) {
      throw new Error("SendMessage returned no MessageId");
    }

    return result.MessageId;
  } catch (error) {
    wrapError("sendMessage", error);
  }
}

/**
 * Send typed JSON payload wrapped in a backend event envelope.
 *
 * @example
 * await sendJsonMessage(
 *   queueUrl,
 *   "order.created",
 *   { orderId: "o1" },
 *   "trace-1",
 * );
 */
export async function sendJsonMessage<TPayload>(queueUrl: string, type: string, payload: TPayload, traceId?: string, sqs: SQSClient = defaultClient): Promise<string> {
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
        ...(traceId && {
          traceId: { DataType: "String", StringValue: traceId },
        }),
      },
    },
    sqs,
  );
}

/**
 * Send a FIFO message with stable group and deduplication IDs.
 *
 * @example
 * await sendFifoMessage(
 *   fifoQueueUrl,
 *   "customer-1",
 *   "order-1",
 *   { orderId: "o1" },
 * );
 */
export async function sendFifoMessage<TPayload>(queueUrl: string, groupId: string, deduplicationId: string, payload: TPayload, sqs: SQSClient = defaultClient): Promise<string> {
  return sendMessage(
    {
      queueUrl,
      body: JSON.stringify(payload),
      groupId,
      deduplicationId,
    },
    sqs,
  );
}

/**
 * Send messages in batch requests.
 * AWS SQS supports max 10 entries per SendMessageBatch request, so this helper chunks automatically.
 *
 * @example
 * const ids = await sendMessageBatch(queueUrl, ["one", "two"]);
 */
export async function sendMessageBatch(queueUrl: string, bodies: string[], sqs: SQSClient = defaultClient): Promise<string[]> {
  if (bodies.length === 0) {
    return [];
  }

  const messageIds: string[] = [];

  try {
    const chunks = chunkArray(bodies, 10);

    for (const chunk of chunks) {
      const result = await sqs.send(
        new SendMessageBatchCommand({
          QueueUrl: queueUrl,
          Entries: chunk.map((body, index) => ({
            Id: String(index),
            MessageBody: body,
          })),
        }),
      );

      const successfulIds = result.Successful?.map((entry) => entry.MessageId).filter((id): id is string => Boolean(id)) ?? [];

      messageIds.push(...successfulIds);
    }

    return messageIds;
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
export async function receiveMessages(queueUrl: string, maxMessages = 1, waitTimeSeconds = 1, sqs: SQSClient = defaultClient): Promise<ReceivedQueueMessage[]> {
  try {
    const result = await sqs.send(
      new ReceiveMessageCommand({
        QueueUrl: queueUrl,
        MaxNumberOfMessages: maxMessages,
        WaitTimeSeconds: waitTimeSeconds,
        AttributeNames: ["All"],
        MessageAttributeNames: ["All"],
      }),
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
export async function deleteMessage(queueUrl: string, receiptHandle: string, sqs: SQSClient = defaultClient): Promise<void> {
  try {
    await sqs.send(
      new DeleteMessageCommand({
        QueueUrl: queueUrl,
        ReceiptHandle: receiptHandle,
      }),
    );
  } catch (error) {
    wrapError("deleteMessage", error);
  }
}

/**
 * Delete messages in batch requests.
 * Messages without receipt handles are counted as failed.
 *
 * @example
 * const result = await deleteMessagesBatch(queueUrl, messages);
 */
export async function deleteMessagesBatch(queueUrl: string, messages: ReceivedQueueMessage[], sqs: SQSClient = defaultClient): Promise<{ deleted: number; failed: number }> {
  if (messages.length === 0) {
    return { deleted: 0, failed: 0 };
  }

  const messagesWithReceiptHandle = messages.filter((message): message is ReceivedQueueMessage & { receiptHandle: string } => Boolean(message.receiptHandle));

  let deleted = 0;
  let failed = messages.length - messagesWithReceiptHandle.length;

  try {
    const chunks = chunkArray(messagesWithReceiptHandle, 10);

    for (const chunk of chunks) {
      const result = await sqs.send(
        new DeleteMessageBatchCommand({
          QueueUrl: queueUrl,
          Entries: chunk.map((message, index) => ({
            Id: String(index),
            ReceiptHandle: message.receiptHandle,
          })),
        }),
      );

      const failedInChunk = result.Failed?.length ?? 0;
      failed += failedInChunk;
      deleted += Math.max(0, chunk.length - failedInChunk);
    }

    return { deleted, failed };
  } catch (error) {
    wrapError("deleteMessagesBatch", error);
  }
}

/**
 * Extend or shorten invisibility window while a worker processes a message.
 *
 * @example
 * await changeMessageVisibility(queueUrl, message.receiptHandle, 60);
 */
export async function changeMessageVisibility(queueUrl: string, receiptHandle: string, visibilityTimeoutSeconds: number, sqs: SQSClient = defaultClient): Promise<void> {
  try {
    await sqs.send(
      new ChangeMessageVisibilityCommand({
        QueueUrl: queueUrl,
        ReceiptHandle: receiptHandle,
        VisibilityTimeout: visibilityTimeoutSeconds,
      }),
    );
  } catch (error) {
    wrapError("changeMessageVisibility", error);
  }
}

/**
 * Set queue attributes after creation.
 *
 * @example
 * await setQueueAttributes(queueUrl, {
 *   ReceiveMessageWaitTimeSeconds: "20",
 * });
 */
export async function setQueueAttributes(queueUrl: string, attributes: Record<string, string>, sqs: SQSClient = defaultClient): Promise<void> {
  try {
    await sqs.send(
      new SetQueueAttributesCommand({
        QueueUrl: queueUrl,
        Attributes: attributes,
      }),
    );
  } catch (error) {
    wrapError("setQueueAttributes", error);
  }
}

/**
 * Process one message and delete it only after handler succeeds.
 *
 * @example
 * await processOneMessage(queueUrl, async (message) => {
 *   console.log(message.body);
 * });
 */
export async function processOneMessage(queueUrl: string, handler: (message: ReceivedQueueMessage) => Promise<void>, sqs: SQSClient = defaultClient): Promise<ProcessOneMessageResult> {
  const [message] = await receiveMessages(queueUrl, 1, 1, sqs);

  if (!message) {
    return { processed: false, deleted: false };
  }

  await handler(message);

  if (message.receiptHandle) {
    await deleteMessage(queueUrl, message.receiptHandle, sqs);

    return {
      processed: true,
      deleted: true,
      messageId: message.id,
    };
  }

  return {
    processed: true,
    deleted: false,
    messageId: message.id,
  };
}

/**
 * Process a small batch.
 * Successful messages are deleted; failed messages remain for retry/DLQ.
 *
 * @example
 * await processMessageBatch(queueUrl, async (message) => {
 *   const payload = JSON.parse(message.body ?? "{}");
 *   await process(payload);
 * });
 */
export async function processMessageBatch(queueUrl: string, handler: (message: ReceivedQueueMessage) => Promise<void>, maxMessages = 10, waitTimeSeconds = 5, sqs: SQSClient = defaultClient): Promise<ProcessMessagesResult> {
  const messages = await receiveMessages(queueUrl, maxMessages, waitTimeSeconds, sqs);

  const result: ProcessMessagesResult = {
    received: messages.length,
    processed: 0,
    deleted: 0,
    failed: 0,
  };

  for (const message of messages) {
    try {
      await handler(message);
      result.processed += 1;

      if (message.receiptHandle) {
        await deleteMessage(queueUrl, message.receiptHandle, sqs);
        result.deleted += 1;
      }
    } catch {
      result.failed += 1;
    }
  }

  return result;
}

/**
 * Read approximate visible, in-flight, and delayed message counts.
 *
 * @example
 * const counts = await getApproximateQueueCounts(queueUrl);
 */
export async function getApproximateQueueCounts(queueUrl: string, sqs: SQSClient = defaultClient): Promise<{ visible: number; notVisible: number; delayed: number }> {
  try {
    const names: QueueAttributeName[] = ["ApproximateNumberOfMessages", "ApproximateNumberOfMessagesNotVisible", "ApproximateNumberOfMessagesDelayed"];

    const result = await sqs.send(
      new GetQueueAttributesCommand({
        QueueUrl: queueUrl,
        AttributeNames: names,
      }),
    );

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
 * Read queue counts and produce alarm hints for observability examples.
 *
 * @example
 * const snapshot = await getQueueMetricsSnapshot(queueUrl, {
 *   backlogWarning: 100,
 * });
 */
export async function getQueueMetricsSnapshot(queueUrl: string, thresholds: { backlogWarning?: number; inFlightWarning?: number } = {}, sqs: SQSClient = defaultClient): Promise<QueueMetricsSnapshot> {
  const counts = await getApproximateQueueCounts(queueUrl, sqs);
  const backlog = counts.visible + counts.notVisible + counts.delayed;
  const alarmHints: string[] = [];

  if (backlog >= (thresholds.backlogWarning ?? 1000)) {
    alarmHints.push("BacklogHigh");
  }

  if (counts.notVisible >= (thresholds.inFlightWarning ?? 100)) {
    alarmHints.push("InFlightHigh");
  }

  return {
    queueUrl,
    ...counts,
    backlog,
    alarmHints,
  };
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
  if (!queueUrl) {
    return;
  }

  try {
    await sqs.send(new DeleteQueueCommand({ QueueUrl: queueUrl }));
  } catch (error) {
    if (awsErrorName(error) === "QueueDoesNotExist") {
      return;
    }

    wrapError("deleteQueue", error);
  }
}

/**
 * List queue URLs, optionally filtered by queue name prefix.
 *
 * @example
 * const queues = await listQueues("orders");
 */
export async function listQueues(prefix = "", sqs: SQSClient = defaultClient): Promise<string[]> {
  try {
    const result = await sqs.send(
      new ListQueuesCommand({
        QueueNamePrefix: prefix || undefined,
      }),
    );

    return result.QueueUrls ?? [];
  } catch (error) {
    wrapError("listQueues", error);
  }
}

/**
 * List source queues configured to use the given dead-letter queue.
 *
 * @example
 * const sources = await listDeadLetterSourceQueues(deadLetterQueueUrl);
 */
export async function listDeadLetterSourceQueues(deadLetterQueueUrl: string, sqs: SQSClient = defaultClient): Promise<string[]> {
  try {
    const result = await sqs.send(
      new ListDeadLetterSourceQueuesCommand({
        QueueUrl: deadLetterQueueUrl,
      }),
    );

    return result.queueUrls ?? [];
  } catch (error) {
    wrapError("listDeadLetterSourceQueues", error);
  }
}

/**
 * Add tags to a queue for ownership, environment, billing, and governance.
 *
 * @example
 * await tagQueue(queueUrl, {
 *   Environment: "dev",
 *   Owner: "platform",
 * });
 */
export async function tagQueue(queueUrl: string, tags: Record<string, string>, sqs: SQSClient = defaultClient): Promise<void> {
  try {
    await sqs.send(
      new TagQueueCommand({
        QueueUrl: queueUrl,
        Tags: tags,
      }),
    );
  } catch (error) {
    wrapError("tagQueue", error);
  }
}

/**
 * List tags attached to a queue.
 *
 * @example
 * const tags = await listQueueTags(queueUrl);
 */
export async function listQueueTags(queueUrl: string, sqs: SQSClient = defaultClient): Promise<Record<string, string>> {
  try {
    const result = await sqs.send(
      new ListQueueTagsCommand({
        QueueUrl: queueUrl,
      }),
    );

    return result.Tags ?? {};
  } catch (error) {
    wrapError("listQueueTags", error);
  }
}

/**
 * Remove selected tags from a queue.
 *
 * @example
 * await untagQueue(queueUrl, ["Owner", "CostCenter"]);
 */
export async function untagQueue(queueUrl: string, tagKeys: string[], sqs: SQSClient = defaultClient): Promise<void> {
  try {
    await sqs.send(
      new UntagQueueCommand({
        QueueUrl: queueUrl,
        TagKeys: tagKeys,
      }),
    );
  } catch (error) {
    wrapError("untagQueue", error);
  }
}

/**
 * Add a queue permission policy statement.
 *
 * @example
 * await addPermission(
 *   queueUrl,
 *   "allow-producer",
 *   ["123456789012"],
 *   ["SendMessage"],
 * );
 */
export async function addPermission(queueUrl: string, label: string, awsAccountIds: string[], actions: string[], sqs: SQSClient = defaultClient): Promise<void> {
  try {
    await sqs.send(
      new AddPermissionCommand({
        QueueUrl: queueUrl,
        Label: label,
        AWSAccountIds: awsAccountIds,
        Actions: actions,
      }),
    );
  } catch (error) {
    wrapError("addPermission", error);
  }
}

/**
 * Remove a permission statement by label.
 *
 * @example
 * await removePermission(queueUrl, "allow-producer");
 */
export async function removePermission(queueUrl: string, label: string, sqs: SQSClient = defaultClient): Promise<void> {
  try {
    await sqs.send(
      new RemovePermissionCommand({
        QueueUrl: queueUrl,
        Label: label,
      }),
    );
  } catch (error) {
    wrapError("removePermission", error);
  }
}

/**
 * Start moving messages from a DLQ back to its source queue.
 *
 * @example
 * const taskHandle = await startMessageMoveTask(deadLetterQueueArn);
 */
export async function startMessageMoveTask(sourceArn: string, sqs: SQSClient = defaultClient): Promise<string> {
  try {
    const result = await sqs.send(
      new StartMessageMoveTaskCommand({
        SourceArn: sourceArn,
      }),
    );

    return result.TaskHandle ?? `move-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  } catch (error) {
    wrapError("startMessageMoveTask", error);
  }
}

/**
 * List recent DLQ message move tasks.
 *
 * @example
 * const tasks = await listMessageMoveTasks(deadLetterQueueArn);
 */
export async function listMessageMoveTasks(sourceArn: string, sqs: SQSClient = defaultClient): Promise<{ taskHandle: string; status: string; sourceArn: string }[]> {
  try {
    const result = await sqs.send(
      new ListMessageMoveTasksCommand({
        SourceArn: sourceArn,
        MaxResults: 1,
      }),
    );

    return (result.Results ?? []).map((task) => ({
      taskHandle: task.TaskHandle ?? "",
      status: task.Status ?? "UNKNOWN",
      sourceArn: task.SourceArn ?? sourceArn,
    }));
  } catch (error) {
    wrapError("listMessageMoveTasks", error);
  }
}

/**
 * Build production-style redrive attributes for compliance-sensitive queues.
 *
 * @example
 * const attrs = buildComplianceRedrivePolicy(dlqArn, 5);
 * await setQueueAttributes(queueUrl, attrs);
 */
export function buildComplianceRedrivePolicy(deadLetterQueueArn: string, maxReceiveCount: number): Record<string, string> {
  return {
    RedrivePolicy: JSON.stringify({
      deadLetterTargetArn: deadLetterQueueArn,
      maxReceiveCount,
    }),
    VisibilityTimeout: String(Math.max(60, maxReceiveCount * 30)),
    MessageRetentionPeriod: String(14 * 24 * 60 * 60),
    ReceiveMessageWaitTimeSeconds: "20",
  };
}

/**
 * Create example CloudWatch alarm configuration objects for SQS queues.
 *
 * @example
 * const alarms = planAlarms("orders", 1000, 1);
 */
export function planAlarms(queueName: string, backlogWarning: number, dlqDepthWarning: number): SqsAlarmConfig[] {
  return [
    {
      name: `sqs-${queueName}-backlog`,
      metric: "ApproximateNumberOfMessagesVisible",
      threshold: backlogWarning,
      comparison: "GT",
      evaluationPeriods: 3,
      action: "BacklogHigh -> scale workers or investigate producer",
    },
    {
      name: `sqs-${queueName}-dlq-depth`,
      metric: "ApproximateNumberOfMessagesVisible",
      threshold: dlqDepthWarning,
      comparison: "GT",
      evaluationPeriods: 1,
      action: "DLQDepthHigh -> replay or investigate failed workers",
    },
    {
      name: `sqs-${queueName}-old-message-age`,
      metric: "ApproximateAgeOfOldestMessage",
      threshold: 300,
      comparison: "GT",
      evaluationPeriods: 2,
      action: "OldMessage -> check worker throughput and DLQ",
    },
    {
      name: `sqs-${queueName}-worker-errors`,
      metric: "NumberOfMessagesSent",
      threshold: 0,
      comparison: "GT",
      evaluationPeriods: 1,
      action: "Errors -> correlate with DLQ messages and structured logs",
    },
  ];
}
