#!/usr/bin/env tsx
import { archiveLifecyclePlan, estimatePutEventsCost, eventBridgeObservabilityPlan } from "../index.js";

const monthlyEvents = 2_500_000;

console.log("CloudWatch alarms and log fields", eventBridgeObservabilityPlan("enterprise-event-bus"));
console.log("monthly PutEvents estimate", estimatePutEventsCost(monthlyEvents));
console.log("DR replay plan", archiveLifecyclePlan("enterprise-bus", "enterprise-archive", 90, 14, "recover projections after regional or downstream outage"));
console.log("runbook", [
  "Watch FailedInvocations and DLQDepth alarms",
  "Pause unsafe consumers before replay",
  "Replay archive into staging bus first",
  "Replay production window with idempotent consumers",
  "Compare projection counts and close incident",
]);
