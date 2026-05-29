#!/usr/bin/env tsx
import {
  createSingleTable,
  deleteTable,
  getJsonEntity,
  putJsonEntityIfAbsent,
  queryAllByPk,
  updateJsonPatch,
} from "../use-cases/table.js";

interface OutboxEvent extends Record<string, string | number | boolean> {
  eventId: string;
  eventType: string;
  aggregateId: string;
  status: string;
  target: string;
}

const table = `floci-ddb-outbox-${Date.now()}`;
await createSingleTable(table);

await putJsonEntityIfAbsent<OutboxEvent>(
  {
    pk: "OUTBOX#PENDING",
    sk: "EVENT#evt-1001",
    entityType: "OutboxEvent",
    value: {
      eventId: "evt-1001",
      eventType: "OrderPaid",
      aggregateId: "ord-1001",
      status: "PENDING",
      target: "sns:orders-topic",
    },
  },
  table,
);

const pending = await queryAllByPk("OUTBOX#PENDING", 10, table);
await updateJsonPatch(
  "OUTBOX#PENDING",
  "EVENT#evt-1001",
  { status: "PUBLISHED" },
  table,
);

console.log({
  eventDrivenPattern:
    "DynamoDB Streams/Lambda can publish pending outbox records to SNS/EventBridge exactly-once-ish with idempotency",
  pending,
  updated: await getJsonEntity<OutboxEvent>(
    "OUTBOX#PENDING",
    "EVENT#evt-1001",
    table,
  ),
});

await deleteTable(table);
