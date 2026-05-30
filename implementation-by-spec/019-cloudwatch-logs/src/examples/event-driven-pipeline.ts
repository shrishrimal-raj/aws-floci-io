#!/usr/bin/env tsx
import { appLogGroupName, jsonFilterPattern, logCostOptimizationPlan, logDisasterRecoveryPlan, subscriptionFilterPlan } from "../index.js";

const app = "fraud-detector";
const environment = "prod";
const logGroupName = appLogGroupName(app, environment);

console.log(
  JSON.stringify(
    {
      logGroupName,
      eventDrivenProcessing: subscriptionFilterPlan({
        filterName: "fraud-alerts-to-opensearch",
        logGroupName,
        destinationArn: "arn:aws:kinesis:us-east-1:123456789012:stream/fraud-alert-logs",
        filterPattern: jsonFilterPattern({ level: "WARN", eventType: "fraud.alert" }),
        roleArn: "arn:aws:iam::123456789012:role/logs-to-kinesis",
        targetService: "kinesis",
      }),
      cost: logCostOptimizationPlan(logGroupName, 18, 30),
      disasterRecovery: logDisasterRecoveryPlan(app, environment, "us-west-2"),
    },
    null,
    2
  )
);
