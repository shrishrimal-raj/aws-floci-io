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

export async function deleteTopic(topicArn: string | undefined, sns: SNSClient = defaultClient): Promise<void> {
  if (!topicArn) return;
  try {
    await sns.send(new DeleteTopicCommand({ TopicArn: topicArn }));
  } catch (error) {
    if (awsErrorName(error) === "NotFound") return;
    wrapError("deleteTopic", error);
  }
}

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

export async function unsubscribe(subscriptionArn: string | undefined, sns: SNSClient = defaultClient): Promise<void> {
  if (!subscriptionArn) return;
  try {
    await sns.send(new UnsubscribeCommand({ SubscriptionArn: subscriptionArn }));
  } catch (error) {
    if (awsErrorName(error) === "NotFound") return;
    wrapError("unsubscribe", error);
  }
}

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
