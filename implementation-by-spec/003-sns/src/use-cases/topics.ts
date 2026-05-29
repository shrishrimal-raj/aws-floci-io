import {
  CreateTopicCommand,
  DeleteTopicCommand,
  ListSubscriptionsByTopicCommand,
  PublishCommand,
  SetSubscriptionAttributesCommand,
  SubscribeCommand,
  UnsubscribeCommand,
  type MessageAttributeValue,
  type SNSClient,
  type Subscription,
} from "@aws-sdk/client-sns";
import { client as defaultClient } from "../client.js";
import { SNSError } from "../errors.js";

export interface CreateTopicInput {
  name: string;
  fifo?: boolean;
  contentBasedDeduplication?: boolean;
  displayName?: string;
}

export interface SubscribeInput {
  topicArn: string;
  protocol:
    | "sqs"
    | "lambda"
    | "http"
    | "https"
    | "email"
    | "sms"
    | "application";
  endpoint: string;
  filterPolicy?: Record<string, unknown>;
  rawMessageDelivery?: boolean;
}

export interface PublishMessageInput {
  topicArn: string;
  message: string;
  subject?: string;
  attributes?: Record<string, MessageAttributeValue>;
  groupId?: string;
  deduplicationId?: string;
}

export interface TopicEventEnvelope<TPayload> {
  type: string;
  payload: TPayload;
  traceId?: string;
  createdAt: string;
}

export interface TopicAuditEvent {
  eventId: string;
  timestamp: string;
  topicArn: string;
  messageId?: string;
  action: string;
  outcome: "PUBLISHED" | "FILTERED" | "DELIVERED" | "FAILED";
  eventType?: string;
  traceId?: string;
  tenantId?: string;
  reason?: string;
}

export interface SubscriptionSummary {
  total: number;
  byProtocol: Record<string, number>;
  endpoints: string[];
}

export interface SnsPublishCostEstimateInput {
  publishes: number;
  freeTierPublishes?: number;
  usdPerMillionPublishes?: number;
}

export interface SnsPublishCostEstimate {
  billablePublishes: number;
  publishUsd: number;
}

export interface RetryOptions {
  attempts?: number;
  baseDelayMs?: number;
  shouldRetry?: (error: unknown) => boolean;
}

function awsErrorName(error: unknown): string {
  if (error instanceof SNSError && error.cause instanceof Error)
    return error.cause.name;
  return error instanceof Error ? error.name : "";
}

function wrapError(operation: string, error: unknown): never {
  const code = awsErrorName(error) || "UNKNOWN";
  throw new SNSError(code, `SNS ${operation} failed`, error);
}

function topicAttributes(input: CreateTopicInput): Record<string, string> {
  const attributes: Record<string, string> = {};
  if (input.fifo) {
    attributes.FifoTopic = "true";
    attributes.ContentBasedDeduplication = String(
      input.contentBasedDeduplication ?? true,
    );
  }
  if (input.displayName) attributes.DisplayName = input.displayName;
  return attributes;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function defaultShouldRetry(error: unknown): boolean {
  const name = awsErrorName(error);
  return [
    "InternalError",
    "Throttled",
    "Throttling",
    "ServiceUnavailable",
    "RequestTimeout",
  ].includes(name);
}

/**
 * Build SNS string attributes used by filter policies, tracing, and tenant-aware routing.
 *
 * @example
 * const attributes = topicMessageAttributes({ eventType: "order.created", tenantId: "acme", traceId: "trace-1" });
 */
export function topicMessageAttributes(
  input: Record<string, string | undefined>,
): Record<string, MessageAttributeValue> {
  return Object.fromEntries(
    Object.entries(input)
      .filter((entry): entry is [string, string] => Boolean(entry[1]))
      .map(([key, value]) => [key, { DataType: "String", StringValue: value }]),
  );
}

/**
 * Parse and validate a JSON event envelope published by publishJsonEvent.
 *
 * @example
 * const event = parseTopicEventEnvelope<{ orderId: string }>(message);
 */
export function parseTopicEventEnvelope<TPayload>(
  message: string,
): TopicEventEnvelope<TPayload> {
  const value = JSON.parse(message) as Partial<TopicEventEnvelope<TPayload>>;
  if (!value.type || !value.createdAt || value.payload === undefined) {
    throw new SNSError("VALIDATION", "message is not a TopicEventEnvelope");
  }
  return value as TopicEventEnvelope<TPayload>;
}

/**
 * Build stable FIFO group/dedup IDs for tenant-scoped domain events.
 *
 * @example
 * fifoEventIds("acme", "order", "order.created", "o1");
 */
export function fifoEventIds(
  tenantId: string,
  aggregateType: string,
  eventType: string,
  aggregateId: string,
): { groupId: string; deduplicationId: string } {
  const clean = (value: string) =>
    value.trim().replace(/[^a-zA-Z0-9._:-]+/g, "-");
  return {
    groupId: `${clean(tenantId)}:${clean(aggregateType)}:${clean(aggregateId)}`,
    deduplicationId: `${clean(eventType)}:${clean(aggregateId)}`,
  };
}

/**
 * Build structured audit event for publish/delivery logs.
 *
 * @example
 * createTopicAuditEvent({ topicArn, action: "OrderPublished", outcome: "PUBLISHED" });
 */
export function createTopicAuditEvent(
  input: Omit<TopicAuditEvent, "eventId" | "timestamp">,
): TopicAuditEvent {
  return {
    eventId: `sns-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    timestamp: new Date().toISOString(),
    ...input,
  };
}

/**
 * Summarize subscriptions for monitoring, runbooks, and tests.
 *
 * @example
 * const summary = summarizeSubscriptions(await listSubscriptions(topicArn));
 */
export function summarizeSubscriptions(
  subscriptions: Subscription[],
): SubscriptionSummary {
  const byProtocol: Record<string, number> = {};
  const endpoints: string[] = [];
  for (const subscription of subscriptions) {
    const protocol = subscription.Protocol ?? "unknown";
    byProtocol[protocol] = (byProtocol[protocol] ?? 0) + 1;
    if (subscription.Endpoint) endpoints.push(subscription.Endpoint);
  }
  return { total: subscriptions.length, byProtocol, endpoints };
}

/**
 * Estimate SNS publish request cost. Defaults are illustrative; verify live AWS Pricing before production use.
 *
 * @example
 * estimateSnsPublishCost({ publishes: 20_000_000 });
 */
export function estimateSnsPublishCost(
  input: SnsPublishCostEstimateInput,
): SnsPublishCostEstimate {
  const billablePublishes = Math.max(
    0,
    input.publishes - (input.freeTierPublishes ?? 1_000_000),
  );
  const publishUsd =
    (billablePublishes / 1_000_000) * (input.usdPerMillionPublishes ?? 0.5);
  return { billablePublishes, publishUsd };
}

/**
 * Create a standard or FIFO pub/sub topic.
 *
 * @example
 * const topicArn = await createTopic({ name: "orders" });
 */
export async function createTopic(
  input: CreateTopicInput,
  sns: SNSClient = defaultClient,
): Promise<string> {
  try {
    const result = await sns.send(
      new CreateTopicCommand({
        Name: input.name,
        Attributes: topicAttributes(input),
      }),
    );
    if (!result.TopicArn) throw new Error("CreateTopic returned no TopicArn");
    return result.TopicArn;
  } catch (error) {
    wrapError("createTopic", error);
  }
}

/**
 * Delete a topic; undefined or already-missing topics are treated as cleaned up.
 *
 * @example
 * await deleteTopic(topicArn);
 */
export async function deleteTopic(
  topicArn: string | undefined,
  sns: SNSClient = defaultClient,
): Promise<void> {
  if (!topicArn) return;
  try {
    await sns.send(new DeleteTopicCommand({ TopicArn: topicArn }));
  } catch (error) {
    if (awsErrorName(error) === "NotFound") return;
    wrapError("deleteTopic", error);
  }
}

/**
 * Subscribe an endpoint and optionally set filter policy/raw delivery.
 *
 * @example
 * await subscribe({ topicArn, protocol: "sqs", endpoint: queueArn, filterPolicy: { eventType: ["order.created"] } });
 */
export async function subscribe(
  input: SubscribeInput,
  sns: SNSClient = defaultClient,
): Promise<string> {
  try {
    const attributes: Record<string, string> = {};
    if (input.filterPolicy)
      attributes.FilterPolicy = JSON.stringify(input.filterPolicy);
    if (input.rawMessageDelivery !== undefined) {
      attributes.RawMessageDelivery = String(input.rawMessageDelivery);
    }

    const result = await sns.send(
      new SubscribeCommand({
        TopicArn: input.topicArn,
        Protocol: input.protocol,
        Endpoint: input.endpoint,
        ReturnSubscriptionArn: true,
        Attributes: attributes,
      }),
    );
    if (!result.SubscriptionArn)
      throw new Error("Subscribe returned no SubscriptionArn");
    return result.SubscriptionArn;
  } catch (error) {
    wrapError("subscribe", error);
  }
}

/**
 * Convenience helper for SQS fanout subscriptions with filter policy.
 *
 * @example
 * await subscribeSqsWithFilter(topicArn, queueArn, { eventType: ["order.created"] });
 */
export async function subscribeSqsWithFilter(
  topicArn: string,
  queueArn: string,
  filterPolicy: Record<string, unknown>,
  sns: SNSClient = defaultClient,
): Promise<string> {
  return subscribe(
    {
      topicArn,
      protocol: "sqs",
      endpoint: queueArn,
      filterPolicy,
      rawMessageDelivery: true,
    },
    sns,
  );
}

/**
 * Replace a subscription filter policy.
 *
 * @example
 * await setSubscriptionFilterPolicy(subscriptionArn, { eventType: ["order.created", "order.updated"] });
 */
export async function setSubscriptionFilterPolicy(
  subscriptionArn: string,
  filterPolicy: Record<string, unknown>,
  sns: SNSClient = defaultClient,
): Promise<void> {
  try {
    await sns.send(
      new SetSubscriptionAttributesCommand({
        SubscriptionArn: subscriptionArn,
        AttributeName: "FilterPolicy",
        AttributeValue: JSON.stringify(filterPolicy),
      }),
    );
  } catch (error) {
    wrapError("setSubscriptionFilterPolicy", error);
  }
}

/**
 * Remove a subscription; undefined or already-missing subscriptions are ignored.
 *
 * @example
 * await unsubscribe(subscriptionArn);
 */
export async function unsubscribe(
  subscriptionArn: string | undefined,
  sns: SNSClient = defaultClient,
): Promise<void> {
  if (!subscriptionArn) return;
  try {
    await sns.send(
      new UnsubscribeCommand({ SubscriptionArn: subscriptionArn }),
    );
  } catch (error) {
    if (awsErrorName(error) === "NotFound") return;
    wrapError("unsubscribe", error);
  }
}

/**
 * Publish a raw string message with optional attributes and FIFO fields.
 *
 * @example
 * await publishMessage({ topicArn, message: "hello", attributes: { eventType: { DataType: "String", StringValue: "demo" } } });
 */
export async function publishMessage(
  input: PublishMessageInput,
  sns: SNSClient = defaultClient,
): Promise<string> {
  try {
    const result = await sns.send(
      new PublishCommand({
        TopicArn: input.topicArn,
        Message: input.message,
        Subject: input.subject,
        MessageAttributes: input.attributes,
        MessageGroupId: input.groupId,
        MessageDeduplicationId: input.deduplicationId,
      }),
    );
    if (!result.MessageId) throw new Error("Publish returned no MessageId");
    return result.MessageId;
  } catch (error) {
    wrapError("publishMessage", error);
  }
}

/**
 * Publish with bounded exponential backoff for transient SNS failures.
 *
 * @example
 * await publishMessageWithRetry({ topicArn, message: "event" }, { attempts: 4 });
 */
export async function publishMessageWithRetry(
  input: PublishMessageInput,
  options: RetryOptions = {},
  sns: SNSClient = defaultClient,
): Promise<string> {
  const attempts = options.attempts ?? 3;
  const baseDelayMs = options.baseDelayMs ?? 100;
  const shouldRetry = options.shouldRetry ?? defaultShouldRetry;
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await publishMessage(input, sns);
    } catch (error) {
      lastError = error;
      if (attempt === attempts || !shouldRetry(error)) throw error;
      await sleep(baseDelayMs * 2 ** (attempt - 1));
    }
  }

  throw lastError;
}

/**
 * Publish typed JSON event with filterable eventType and optional traceId attributes.
 *
 * @example
 * await publishJsonEvent(topicArn, "order.created", { orderId: "o1" }, "trace-1");
 */
export async function publishJsonEvent<TPayload>(
  topicArn: string,
  type: string,
  payload: TPayload,
  traceId?: string,
  sns: SNSClient = defaultClient,
): Promise<string> {
  const envelope: TopicEventEnvelope<TPayload> = {
    type,
    payload,
    traceId,
    createdAt: new Date().toISOString(),
  };

  return publishMessage(
    {
      topicArn,
      message: JSON.stringify(envelope),
      attributes: topicMessageAttributes({ eventType: type, traceId }),
    },
    sns,
  );
}

/**
 * Publish typed JSON event to FIFO topic with group and deduplication IDs.
 *
 * @example
 * await publishFifoJsonEvent(fifoTopicArn, "customer-1", "event-1", "order.created", { orderId: "o1" });
 */
export async function publishFifoJsonEvent<TPayload>(
  topicArn: string,
  groupId: string,
  deduplicationId: string,
  type: string,
  payload: TPayload,
  sns: SNSClient = defaultClient,
): Promise<string> {
  const envelope: TopicEventEnvelope<TPayload> = {
    type,
    payload,
    createdAt: new Date().toISOString(),
  };

  return publishMessage(
    {
      topicArn,
      message: JSON.stringify(envelope),
      attributes: topicMessageAttributes({ eventType: type }),
      groupId,
      deduplicationId,
    },
    sns,
  );
}

/**
 * List all subscriptions attached to a topic with pagination.
 *
 * @example
 * const subscriptions = await listSubscriptions(topicArn);
 */
export async function listSubscriptions(
  topicArn: string,
  sns: SNSClient = defaultClient,
): Promise<Subscription[]> {
  try {
    const subscriptions: Subscription[] = [];
    let nextToken: string | undefined;

    do {
      const result = await sns.send(
        new ListSubscriptionsByTopicCommand({
          TopicArn: topicArn,
          NextToken: nextToken,
        }),
      );
      subscriptions.push(...(result.Subscriptions ?? []));
      nextToken = result.NextToken;
    } while (nextToken);

    return subscriptions;
  } catch (error) {
    wrapError("listSubscriptions", error);
  }
}
