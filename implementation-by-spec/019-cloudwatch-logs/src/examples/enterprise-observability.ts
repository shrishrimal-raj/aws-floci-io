#!/usr/bin/env tsx
import {
  appLogGroupName,
  buildLogAuditEntry,
  enterpriseApplicationLog,
  jsonFilterPattern,
  logGroupReadPolicy,
  metricFilterPlan,
  safeLogStreamName,
  subscriptionFilterPlan,
  withCloudWatchLogsRetry,
} from "../index.js";

const logGroupName = appLogGroupName("checkout-api", "prod");
const logStreamName = safeLogStreamName("ecs-task", "task/blue:42");
const publishResult = await withCloudWatchLogsRetry(async () => "log-event-prepared", { maxAttempts: 3, baseDelayMs: 25, backoffRate: 2 });

console.log(
  JSON.stringify(
    {
      publishResult,
      logGroupName,
      logStreamName,
      appLog: enterpriseApplicationLog("ERROR", "checkout.payment_failed", {
        service: "checkout-api",
        environment: "prod",
        tenantId: "tenant-a",
        correlationId: "corr-checkout-42",
        orderId: "order-42",
        token: "secret-token",
      }),
      errorMetric: metricFilterPlan({
        filterName: "checkout-payment-errors",
        logGroupName,
        filterPattern: jsonFilterPattern({ level: "ERROR", service: "checkout-api" }),
        metricNamespace: "Checkout/Logs",
        metricName: "PaymentErrorCount",
        metricValue: "1",
        alarmThreshold: 3,
      }),
      subscription: subscriptionFilterPlan({
        filterName: "checkout-errors-to-lambda",
        logGroupName,
        destinationArn: "arn:aws:lambda:us-east-1:123456789012:function:incident-router",
        filterPattern: jsonFilterPattern({ level: "ERROR" }),
        targetService: "lambda",
      }),
      readPolicy: logGroupReadPolicy(logGroupName, "us-east-1", "123456789012", "arn:aws:iam::210987654321:role/observability-reader"),
      audit: buildLogAuditEntry({
        eventId: "evt-query-checkout-errors",
        actor: "incident-commander",
        action: "FilterLogEvents",
        logGroupName,
        outcome: "ALLOW",
        metadata: { ticket: "INC-1001" },
      }),
    },
    null,
    2
  )
);
