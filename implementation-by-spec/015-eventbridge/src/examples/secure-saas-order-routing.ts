#!/usr/bin/env tsx
import { auditEvent, enterpriseEvent, publishEnterpriseEvent, tenantEventPattern, type TenantActor } from "../index.js";

const actor: TenantActor = {
  tenantId: "tenant-a",
  principalId: "user-123",
  roles: ["publisher"],
  requestId: "req-001",
};

const orderCreated = enterpriseEvent({
  eventBusName: process.env.EVENT_BUS_NAME ?? "orders-bus",
  source: "com.acme.orders",
  detailType: "order.created",
  tenantId: actor.tenantId,
  producer: "checkout-api",
  correlationId: actor.requestId,
  detail: { orderId: "o-100", amountCents: 12_900, currency: "USD" },
});

console.log("tenant-specific rule pattern", tenantEventPattern("com.acme.orders", "order.created", actor.tenantId));
console.log("audit envelope", auditEvent(actor, orderCreated.eventBusName, "orders.publish", "o-100", "attempt"));

// Real publish path: uncomment when Floci/AWS bus exists.
// await publishEnterpriseEvent(actor, { ...orderCreated, tenantId: actor.tenantId, producer: "checkout-api", detail: orderCreated.detail.detail });
console.log("ready to publish", await Promise.resolve(orderCreated));
