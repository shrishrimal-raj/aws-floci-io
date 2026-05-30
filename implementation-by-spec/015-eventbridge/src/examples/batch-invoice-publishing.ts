#!/usr/bin/env tsx
import { estimatePutEventsCost, enterpriseEvent, publishEventsInBatches } from "../index.js";

const events = Array.from({ length: 25 }, (_, index) =>
  enterpriseEvent({
    eventBusName: process.env.EVENT_BUS_NAME ?? "billing-bus",
    source: "com.acme.billing",
    detailType: "invoice.created",
    tenantId: "tenant-a",
    producer: "billing-worker",
    eventId: `invoice-${index + 1}`,
    correlationId: "billing-run-2026-05-30",
    detail: { invoiceId: `inv-${index + 1}`, amountCents: 2_500 + index },
  })
);

console.log("cost estimate", estimatePutEventsCost(events.length));
console.log("will publish in batches", Math.ceil(events.length / 10));

// Real publish path when bus exists:
// console.log(await publishEventsInBatches(events));
await Promise.resolve(publishEventsInBatches.name);
