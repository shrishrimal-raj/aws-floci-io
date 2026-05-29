#!/usr/bin/env tsx
import { eventPattern, putRuleTarget } from "../use-cases/events.js";

console.log(eventPattern("app.orders", "order.created"));
console.log(
  await putRuleTarget(
    "orders-created",
    process.env.EVENT_BUS_NAME ?? "default",
    "app.orders",
    "order.created",
    "arn:aws:sqs:us-east-1:000000000000:orders"
  )
);
