#!/usr/bin/env tsx
import { backupCompliance, forecastMonthlyCost, groupCostByTag, toEmbeddedMetricFormat, validateRequiredTags } from "../../../src/index.js";

const metric = toEmbeddedMetricFormat({
  namespace: "OpsCommandCenter",
  service: "taskflow-api",
  name: "ErrorRate",
  value: 0.7,
  unit: "Percent",
  dimensions: { Environment: "dev" },
});

const missingTags = validateRequiredTags({
  arn: "arn:aws:dynamodb:us-east-1:123456789012:table/taskflow",
  tags: { Environment: "dev", Owner: "platform" },
});

const costByProject = groupCostByTag(
  [
    { service: "Lambda", amountUsd: 12.5, tags: { Project: "taskflow" } },
    { service: "DynamoDB", amountUsd: 31.25, tags: { Project: "taskflow" } },
    { service: "S3", amountUsd: 4.75, tags: {} },
  ],
  "Project",
);

console.log("Ops & Cost Command Center demo");
console.log(JSON.stringify({ metric: JSON.parse(metric), missingTags, costByProject, forecast: forecastMonthlyCost([10, 12, 14]), backup: backupCompliance([{ arn: "db", protected: true }, { arn: "bucket", protected: false }]) }, null, 2));
