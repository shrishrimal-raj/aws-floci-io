import {
  CreateEventBusCommand,
  DeleteEventBusCommand,
  DeleteRuleCommand,
  PutEventsCommand,
  PutRuleCommand,
  PutTargetsCommand,
  RemoveTargetsCommand,
  type EventBridgeClient,
  type PutEventsRequestEntry,
} from "@aws-sdk/client-eventbridge";
import { client as defaultClient } from "../client.js";
import { EventBridgeError } from "../errors.js";

export interface EventRuleTarget {
  ruleArn?: string;
  targetId: string;
  targetArn: string;
}

export interface AppEvent<TDetail> {
  eventBusName: string;
  source: string;
  detailType: string;
  detail: TDetail;
}

function awsErrorName(error: unknown): string {
  if (error instanceof EventBridgeError && error.cause instanceof Error) return error.cause.name;
  return error instanceof Error ? error.name : "";
}

function wrapError(operation: string, error: unknown): never {
  const code = awsErrorName(error) || "UNKNOWN";
  throw new EventBridgeError(code, `EventBridge ${operation} failed`, error);
}

/**
 * Create custom event bus; existing bus returns name for idempotent labs.
 *
 * @example
 * const busArn = await createBus("orders");
 */
export async function createBus(name: string, eb: EventBridgeClient = defaultClient): Promise<string | undefined> {
  try {
    return (await eb.send(new CreateEventBusCommand({ Name: name }))).EventBusArn;
  } catch (error) {
    if (awsErrorName(error) === "ResourceAlreadyExistsException") return name;
    wrapError("createBus", error);
  }
}

/**
 * Build EventBridge event pattern object.
 *
 * @example
 * const pattern = eventPattern("app.orders", "order.created");
 */
export function eventPattern(source: string, detailType: string): { source: string[]; "detail-type": string[] } {
  return { source: [source], "detail-type": [detailType] };
}

/**
 * Create rule matching source and detail-type.
 *
 * @example
 * const ruleArn = await putRule("orders-created", "orders", "app.orders", "order.created");
 */
export async function putRule(
  name: string,
  eventBusName: string,
  source: string,
  detailType: string,
  eb: EventBridgeClient = defaultClient
): Promise<string | undefined> {
  try {
    return (
      await eb.send(
        new PutRuleCommand({ Name: name, EventBusName: eventBusName, EventPattern: JSON.stringify(eventPattern(source, detailType)) })
      )
    ).RuleArn;
  } catch (error) {
    wrapError("putRule", error);
  }
}

/**
 * Attach target ARN to rule.
 *
 * @example
 * await putTarget("orders-created", "orders", queueArn, "orders-queue");
 */
export async function putTarget(
  rule: string,
  eventBusName: string,
  targetArn: string,
  id = "target",
  eb: EventBridgeClient = defaultClient
): Promise<void> {
  try {
    await eb.send(new PutTargetsCommand({ Rule: rule, EventBusName: eventBusName, Targets: [{ Id: id, Arn: targetArn }] }));
  } catch (error) {
    wrapError("putTarget", error);
  }
}

/**
 * Create rule and attach one target.
 *
 * @example
 * await putRuleTarget("orders-created", "orders", "app.orders", "order.created", queueArn);
 */
export async function putRuleTarget(
  rule: string,
  eventBusName: string,
  source: string,
  detailType: string,
  targetArn: string,
  targetId = "target",
  eb: EventBridgeClient = defaultClient
): Promise<EventRuleTarget> {
  const ruleArn = await putRule(rule, eventBusName, source, detailType, eb);
  await putTarget(rule, eventBusName, targetArn, targetId, eb);
  return { ruleArn, targetId, targetArn };
}

/**
 * Publish one typed event to bus.
 *
 * @example
 * const id = await publishEvent("orders", "app.orders", "order.created", { orderId: "o1" });
 */
export async function publishEvent(
  eventBusName: string,
  source: string,
  detailType: string,
  detail: unknown,
  eb: EventBridgeClient = defaultClient
): Promise<string | undefined> {
  try {
    return (
      await eb.send(new PutEventsCommand({ Entries: [{ EventBusName: eventBusName, Source: source, DetailType: detailType, Detail: JSON.stringify(detail) }] }))
    ).Entries?.[0]?.EventId;
  } catch (error) {
    wrapError("publishEvent", error);
  }
}

/**
 * Publish multiple typed events in one PutEvents request.
 *
 * @example
 * const ids = await publishEvents([{ eventBusName: "orders", source: "app", detailType: "created", detail: {} }]);
 */
export async function publishEvents(
  events: AppEvent<unknown>[],
  eb: EventBridgeClient = defaultClient
): Promise<(string | undefined)[]> {
  try {
    const entries: PutEventsRequestEntry[] = events.map((event) => ({
      EventBusName: event.eventBusName,
      Source: event.source,
      DetailType: event.detailType,
      Detail: JSON.stringify(event.detail),
    }));
    return (await eb.send(new PutEventsCommand({ Entries: entries }))).Entries?.map((entry) => entry.EventId) ?? [];
  } catch (error) {
    wrapError("publishEvents", error);
  }
}

/**
 * Remove targets then delete rule; missing rules are ignored.
 *
 * @example
 * await deleteRuleWithTargets("orders-created", "orders", ["orders-queue"]);
 */
export async function deleteRuleWithTargets(
  rule: string,
  eventBusName: string,
  targetIds: string[] = [],
  eb: EventBridgeClient = defaultClient
): Promise<void> {
  try {
    if (targetIds.length) await eb.send(new RemoveTargetsCommand({ Rule: rule, EventBusName: eventBusName, Ids: targetIds }));
    await eb.send(new DeleteRuleCommand({ Name: rule, EventBusName: eventBusName }));
  } catch (error) {
    if (awsErrorName(error) === "ResourceNotFoundException") return;
    wrapError("deleteRuleWithTargets", error);
  }
}

/**
 * Delete event bus; undefined or missing buses are ignored.
 *
 * @example
 * await deleteBus("orders");
 */
export async function deleteBus(name: string | undefined, eb: EventBridgeClient = defaultClient): Promise<void> {
  if (!name) return;
  try {
    await eb.send(new DeleteEventBusCommand({ Name: name }));
  } catch (error) {
    if (awsErrorName(error) === "ResourceNotFoundException") return;
    wrapError("deleteBus", error);
  }
}
