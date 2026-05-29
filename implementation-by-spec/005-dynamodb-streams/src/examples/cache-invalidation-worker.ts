#!/usr/bin/env tsx
import {
  attributeMapToJson,
  processStreamRecords,
} from "../use-cases/streams.js";

const records = [
  {
    eventName: "MODIFY" as const,
    dynamodb: {
      Keys: { pk: { S: "TENANT#acme#PRODUCT#sku-1" }, sk: { S: "PROFILE" } },
      OldImage: { priceCents: { N: "1999" }, version: { N: "1" } },
      NewImage: { priceCents: { N: "2499" }, version: { N: "2" } },
      SequenceNumber: "3001",
    },
  },
];

const result = await processStreamRecords(records, async (record) => {
  if (record.eventName !== "MODIFY") return false;
  const keys = attributeMapToJson(record.dynamodb?.Keys);
  const oldImage = attributeMapToJson(record.dynamodb?.OldImage);
  const newImage = attributeMapToJson(record.dynamodb?.NewImage);

  console.log({
    integration:
      "invalidate Redis/CloudFront/OpenSearch projection when product item changes",
    cacheKey: `product:${keys.pk}`,
    changed: { oldImage, newImage },
  });
});

console.log(result);
