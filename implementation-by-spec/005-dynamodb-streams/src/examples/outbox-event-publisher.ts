#!/usr/bin/env tsx
import {
  attributeMapToJson,
  filterRecordsByEventName,
  processStreamRecords,
} from "../use-cases/streams.js";

const records = [
  {
    eventName: "INSERT" as const,
    dynamodb: {
      Keys: { pk: { S: "OUTBOX#PENDING" }, sk: { S: "EVENT#evt-1001" } },
      NewImage: {
        pk: { S: "OUTBOX#PENDING" },
        sk: { S: "EVENT#evt-1001" },
        eventType: { S: "OrderPaid" },
        aggregateId: { S: "ord-1001" },
        target: { S: "sns:orders" },
      },
      SequenceNumber: "2001",
    },
  },
];

const inserts = filterRecordsByEventName(records, "INSERT");
const result = await processStreamRecords(inserts, async (record) => {
  const outbox = attributeMapToJson(record.dynamodb?.NewImage);
  console.log({
    eventDrivenPattern:
      "DynamoDB Streams consumer publishes outbox rows to SNS/EventBridge/SQS",
    outbox,
    productionControls: [
      "idempotency table",
      "partial batch failure",
      "DLQ/on-failure destination",
      "traceId propagation",
    ],
  });
});

console.log(result);
