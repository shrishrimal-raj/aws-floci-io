#!/usr/bin/env tsx
import {
  batchGetItem,
  batchWriteItem,
  createSingleTable,
  deleteTable,
} from "../use-cases/table.js";

interface Product extends Record<string, string | number> {
  productId: string;
  name: string;
  price: number;
  category: string;
  stock: number;
}

const table = `floci-ddb-batch-${Date.now()}`;
await createSingleTable(table);

// Batch write multiple products
console.log("Batch writing products...");
await batchWriteItem(
  {
    [table]: [
      {
        PutRequest: {
          Item: {
            pk: { S: "PRODUCT#001" },
            sk: { S: "METADATA" },
            productId: { S: "P001" },
            name: { S: "Laptop" },
            price: { N: "999.99" },
            category: { S: "Electronics" },
            stock: { N: "50" },
          },
        },
      },
      {
        PutRequest: {
          Item: {
            pk: { S: "PRODUCT#002" },
            sk: { S: "METADATA" },
            productId: { S: "P002" },
            name: { S: "Mouse" },
            price: { N: "29.99" },
            category: { S: "Electronics" },
            stock: { N: "100" },
          },
        },
      },
      {
        PutRequest: {
          Item: {
            pk: { S: "PRODUCT#003" },
            sk: { S: "METADATA" },
            productId: { S: "P003" },
            name: { S: "Keyboard" },
            price: { N: "79.99" },
            category: { S: "Electronics" },
            stock: { N: "75" },
          },
        },
      },
      {
        PutRequest: {
          Item: {
            pk: { S: "PRODUCT#004" },
            sk: { S: "METADATA" },
            productId: { S: "P004" },
            name: { S: "Monitor" },
            price: { N: "299.99" },
            category: { S: "Electronics" },
            stock: { N: "30" },
          },
        },
      },
      {
        PutRequest: {
          Item: {
            pk: { S: "PRODUCT#005" },
            sk: { S: "METADATA" },
            productId: { S: "P005" },
            name: { S: "Desk Chair" },
            price: { N: "199.99" },
            category: { S: "Furniture" },
            stock: { N: "25" },
          },
        },
      },
    ],
  },
  table
);

// Batch read multiple products
console.log("\nBatch reading products...");
const batchResponse = await batchGetItem(
  {
    [table]: {
      Keys: [
        { pk: { S: "PRODUCT#001" }, sk: { S: "METADATA" } },
        { pk: { S: "PRODUCT#003" }, sk: { S: "METADATA" } },
        { pk: { S: "PRODUCT#005" }, sk: { S: "METADATA" } },
        // This one doesn't exist - will return empty for this key
        { pk: { S: "PRODUCT#999" }, sk: { S: "METADATA" } },
      ],
      ConsistentRead: true,
    },
  },
  table
);

console.log("Retrieved items:", batchResponse.Responses?.[table] || []);

// Batch delete some products
console.log("\nBatch deleting products...");
await batchWriteItem(
  {
    [table]: [
      {
        DeleteRequest: {
          Key: { pk: { S: "PRODUCT#002" }, sk: { S: "METADATA" } },
        },
      },
      {
        DeleteRequest: {
          Key: { pk: { S: "PRODUCT#004" }, sk: { S: "METADATA" } },
        },
      },
    ],
  },
  table
);

// Verify deletions
console.log("\nVerifying deletions...");
const afterDeleteResponse = await batchGetItem(
  {
    [table]: {
      Keys: [
        { pk: { S: "PRODUCT#002" }, sk: { S: "METADATA" } },
        { pk: { S: "PRODUCT#004" }, sk: { S: "METADATA" } },
        { pk: { S: "PRODUCT#001" }, sk: { S: "METADATA" } }, // This one still exists
      ],
    },
  },
  table
);

console.log("Items after deletion:", afterDeleteResponse.Responses?.[table] || []);

await deleteTable(table);