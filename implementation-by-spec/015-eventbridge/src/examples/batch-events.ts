#!/usr/bin/env tsx
import { createBus, deleteBus, publishEvents } from "../use-cases/events.js";

const bus = `floci-events-batch-${Date.now()}`;
await createBus(bus);
try {
  console.log(
    await publishEvents([
      { eventBusName: bus, source: "app.orders", detailType: "order.created", detail: { orderId: "o1" } },
      { eventBusName: bus, source: "app.orders", detailType: "order.paid", detail: { orderId: "o1" } },
    ])
  );
} finally {
  await deleteBus(bus);
}
