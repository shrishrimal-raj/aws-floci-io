#!/usr/bin/env tsx
import {
  attributeMapToJson,
  createStreamAuditEvent,
  processStreamRecords,
} from "../use-cases/streams.js";

const records = [
  {
    eventName: "REMOVE" as const,
    dynamodb: {
      Keys: { pk: { S: "TENANT#acme#SESSION#session-1" }, sk: { S: "CART#1" } },
      OldImage: {
        tenantId: { S: "acme" },
        sku: { S: "sku-1" },
        quantity: { N: "2" },
      },
      SequenceNumber: "4001",
      ApproximateCreationDateTime: new Date(),
    },
  },
];

const result = await processStreamRecords(records, async (record) => {
  if (record.eventName !== "REMOVE") return false;
  const oldImage = attributeMapToJson(record.dynamodb?.OldImage);
  console.log({
    dataLifecyclePattern:
      "react to TTL/session cleanup deletes by removing derived state and writing audit evidence",
    oldImage,
    audit: createStreamAuditEvent(record, "SessionItemRemoved", "PROCESSED", {
      tenantId: String(oldImage.tenantId),
    }),
  });
});

console.log(result);
