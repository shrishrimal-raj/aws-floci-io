import { PutEventsCommand, type EventBridgeClient } from "@aws-sdk/client-eventbridge";

export type CommerceEventType = "CartCreated" | "ItemAdded" | "CheckoutStarted" | "PaymentAuthorized" | "OrderPlaced" | "OrderFailed";

export interface DomainEvent<T = Record<string, unknown>> {
  id: string;
  type: CommerceEventType;
  source: "commerce.cart" | "commerce.checkout" | "commerce.order";
  tenantId: string;
  subject: string;
  version: number;
  time: string;
  detail: T;
}

/**
 * Creates immutable, versioned commerce domain event.
 * Example: checkout service emits `CheckoutStarted` with tenant, cart, and amount details.
 */
export function createDomainEvent<T>(input: Omit<DomainEvent<T>, "id" | "time" | "version"> & { version?: number }): DomainEvent<T> {
  return { ...input, id: crypto.randomUUID(), time: new Date().toISOString(), version: input.version ?? 1 };
}

/**
 * Builds EventBridge rule pattern for selected commerce event types.
 * Example: fulfillment team subscribes only to `OrderPlaced` and `OrderFailed` events.
 */
export function eventPatternForTypes(types: CommerceEventType[]): Record<string, unknown> {
  return { source: ["commerce.cart", "commerce.checkout", "commerce.order"], "detail-type": types };
}

/**
 * Publishes domain events to custom EventBridge bus.
 * Example: order API publishes `OrderPlaced`; notification, analytics, and billing consume independently.
 */
export class CommerceEventBus {
  constructor(private readonly eventBridge: EventBridgeClient, private readonly busName = process.env.COMMERCE_EVENT_BUS ?? "commerce") {}

  async publish(events: DomainEvent[]): Promise<void> {
    await this.eventBridge.send(
      new PutEventsCommand({
        Entries: events.map((event) => ({
          EventBusName: this.busName,
          Source: event.source,
          DetailType: event.type,
          Detail: JSON.stringify(event),
          Time: new Date(event.time),
        })),
      })
    );
  }
}
