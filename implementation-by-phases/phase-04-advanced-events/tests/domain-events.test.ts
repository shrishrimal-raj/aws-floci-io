import { describe, expect, it } from "vitest";
import { CommerceEventBus, createDomainEvent, eventPatternForTypes } from "../src/domain-events.js";

class FakeClient {
  commands: unknown[] = [];
  async send(command: unknown) {
    this.commands.push(command);
    return {};
  }
}

describe("EventBridge domain events", () => {
  it("creates versioned commerce domain events", () => {
    const event = createDomainEvent({ source: "commerce.order", type: "OrderPlaced", tenantId: "tenant-a", subject: "order-1", detail: { total: 42 } });
    expect(event).toMatchObject({ source: "commerce.order", type: "OrderPlaced", tenantId: "tenant-a", version: 1 });
    expect(event.id).toBeTruthy();
  });

  it("builds rule patterns for event types", () => {
    expect(eventPatternForTypes(["OrderPlaced"])).toEqual({ source: ["commerce.cart", "commerce.checkout", "commerce.order"], "detail-type": ["OrderPlaced"] });
  });

  it("publishes events to EventBridge", async () => {
    const client = new FakeClient();
    await new CommerceEventBus(client as never, "commerce").publish([
      createDomainEvent({ source: "commerce.cart", type: "CartCreated", tenantId: "t", subject: "c", detail: {} }),
    ]);
    expect(client.commands[0]?.constructor.name).toBe("PutEventsCommand");
  });
});
