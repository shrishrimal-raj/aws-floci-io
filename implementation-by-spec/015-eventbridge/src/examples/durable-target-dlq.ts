#!/usr/bin/env tsx
import { eventBridgeObservabilityPlan, putDurableTarget } from "../index.js";

const bus = process.env.EVENT_BUS_NAME ?? "orders-bus";
const rule = "orders-created";
const queueArn = "arn:aws:sqs:us-east-1:000000000000:orders-created";
const dlqArn = "arn:aws:sqs:us-east-1:000000000000:orders-created-dlq";

console.log("observability plan", eventBridgeObservabilityPlan("orders-event-router"));
console.log("durable target config", { rule, bus, queueArn, dlqArn, retryAttempts: 3, maxEventAgeSeconds: 86_400 });

// Real setup path when queue + DLQ exist:
// await putDurableTarget(rule, bus, queueArn, dlqArn, "orders-queue");
await Promise.resolve(putDurableTarget.name);
