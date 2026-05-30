#!/usr/bin/env tsx
import { appLogGroupName, jsonFilterPattern, logCostOptimizationPlan, logLifecyclePlan, metricFilterPlan } from "../index.js";

const logGroupName = appLogGroupName("orders-api", "prod");
const lifecycle = logLifecyclePlan("orders-api", "prod", false);
const errorMetric = metricFilterPlan({
  filterName: "orders-prod-errors",
  logGroupName,
  filterPattern: jsonFilterPattern({ level: "ERROR", service: "orders-api" }),
  metricNamespace: "OrdersApi/Logs",
  metricName: "ErrorCount",
  metricValue: "1",
  alarmThreshold: 5,
});

console.log(JSON.stringify({ lifecycle, errorMetric, cost: logCostOptimizationPlan(logGroupName, 4, lifecycle.retentionDays) }, null, 2));
