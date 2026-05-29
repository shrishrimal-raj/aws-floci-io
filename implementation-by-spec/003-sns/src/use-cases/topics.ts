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
  protocol: "sqs" | "lambda" | "http" | "https" | "email" | "sms" | "application";
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

function awsErrorName(error: unknown): string {
  if (error instanceof SNSError && error.cause instanceof Error) return error.cause.name;
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
    attributes.ContentBasedDeduplication = String(input.contentBasedDeduplication ?? true);
  }
  if (input.displayName) attributes.DisplayName = input.displayName;
  return attributes;
}

/**
 * Create a standard or FIFO pub/sub topic.
 *
 * @example
 * const topicArn = await createTopic({ name: "orders" });
 */
export async function createTopic(input: CreateTopicInput, sns: SNSClient = defaultClient): Promise<string> {
  try {
    const result = await sns.send(
      new CreateTopicCommand({ Name: input.name, Attributes: topicAttributes(input) })
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
export async function deleteTopic(topicArn: string | undefined, sns: SNSClient = defaultClient): Promise<void> {
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
export async function subscribe(input: SubscribeInput, sns: SNSClient = defaultClient): Promise<string> {
  try {
    const attributes: Record<string, string> = {};
    if (input.filterPolicy) attributes.FilterPolicy = JSON.stringify(input.filterPolicy);
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
      })
    );
    if (!result.SubscriptionArn) throw new Error("Subscribe returned no SubscriptionArn");
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
  sns: SNSClient = defaultClient
): Promise<string> {
  return subscribe(
    {
      topicArn,
      protocol: "sqs",
      endpoint: queueArn,
      filterPolicy,
      rawMessageDelivery: true,
    },
    sns
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
  sns: SNSClient = defaultClient
): Promise<void> {
  try {
    await sns.send(
      new SetSubscriptionAttributesCommand({
        SubscriptionArn: subscriptionArn,
        AttributeName: "FilterPolicy",
        AttributeValue: JSON.stringify(filterPolicy),
      })
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
export async function unsubscribe(subscriptionArn: string | undefined, sns: SNSClient = defaultClient): Promise<void> {
  if (!subscriptionArn) return;
  try {
    await sns.send(new UnsubscribeCommand({ SubscriptionArn: subscriptionArn }));
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
export async function publishMessage(input: PublishMessageInput, sns: SNSClient = defaultClient): Promise<string> {
  try {
    const result = await sns.send(
      new PublishCommand({
        TopicArn: input.topicArn,
        Message: input.message,
        Subject: input.subject,
        MessageAttributes: input.attributes,
        MessageGroupId: input.groupId,
        MessageDeduplicationId: input.deduplicationId,
      })
    );
    if (!result.MessageId) throw new Error("Publish returned no MessageId");
    return result.MessageId;
  } catch (error) {
    wrapError("publishMessage", error);
  }
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
  sns: SNSClient = defaultClient
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
      attributes: {
        eventType: { DataType: "String", StringValue: type },
        ...(traceId && { traceId: { DataType: "String", StringValue: traceId } }),
      },
    },
    sns
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
  sns: SNSClient = defaultClient
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
      attributes: { eventType: { DataType: "String", StringValue: type } },
      groupId,
      deduplicationId,
    },
    sns
  );
}

/**
 * List all subscriptions attached to a topic with pagination.
 *
 * @example
 * const subscriptions = await listSubscriptions(topicArn);
 */
export async function listSubscriptions(topicArn: string, sns: SNSClient = defaultClient): Promise<Subscription[]> {
  try {
    const subscriptions: Subscription[] = [];
    let nextToken: string | undefined;

    do {
      const result = await sns.send(
        new ListSubscriptionsByTopicCommand({ TopicArn: topicArn, NextToken: nextToken })
      );
      subscriptions.push(...(result.Subscriptions ?? []));
      nextToken = result.NextToken;
    } while (nextToken);

    return subscriptions;
  } catch (error) {
    wrapError("listSubscriptions", error);
  }
}
