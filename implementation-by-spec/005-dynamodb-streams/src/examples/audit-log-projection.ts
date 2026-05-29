#!/usr/bin/env tsx
import {
  attributeMapToJson,
  createStreamAuditEvent,
  processStreamRecords,
  streamRecordIdempotencyKey,
} from "../use-cases/streams.js";

const records = [
  {
    eventName: "INSERT" as const,
    dynamodb: {
      Keys: { pk: { S: "TENANT#acme#ORDER#ord-1001" }, sk: { S: "PROFILE" } },
      NewImage: {
        pk: { S: "TENANT#acme#ORDER#ord-1001" },
        sk: { S: "PROFILE" },
        tenantId: { S: "acme" },
        status: { S: "PAID" },
      },
      SequenceNumber: "1001",
      ApproximateCreationDateTime: new Date(),
    },
  },
];

const processed = new Set<string>();
const result = await processStreamRecords(records, async (record) => {
  const idempotencyKey = streamRecordIdempotencyKey(record);
  if (processed.has(idempotencyKey)) return false;
  processed.add(idempotencyKey);

  const image = attributeMapToJson(record.dynamodb?.NewImage);
  console.log({
    projection:
      "write audit projection to OpenSearch/S3/CloudWatch in production",
    image,
    audit: createStreamAuditEvent(record, "OrderProjected", "PROCESSED", {
      tenantId: String(image.tenantId),
    }),
  });
});

console.log({ result });
