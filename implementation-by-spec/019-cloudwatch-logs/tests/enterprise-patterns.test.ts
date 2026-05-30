import { describe, expect, it, vi } from "vitest";
import type { CloudWatchLogsClient } from "@aws-sdk/client-cloudwatch-logs";
import {
  appLogGroupName,
  buildLogAuditEntry,
  enforceLogRetention,
  enterpriseApplicationLog,
  jsonFilterPattern,
  logCostOptimizationPlan,
  logDisasterRecoveryPlan,
  logGroupReadPolicy,
  logLifecyclePlan,
  metricFilterPlan,
  redactSensitiveFields,
  safeLogStreamName,
  subscriptionFilterPlan,
  withCloudWatchLogsRetry,
} from "../src/index.js";

function recordingClient(): { client: CloudWatchLogsClient; commands: unknown[] } {
  const commands: unknown[] = [];
  return {
    commands,
    client: { send: vi.fn(async (command: unknown) => { commands.push(command); return {}; }) } as unknown as CloudWatchLogsClient,
  };
}

describe("CloudWatch Logs enterprise patterns", () => {
  it("retries transient CloudWatch Logs operations", async () => {
    const operation = vi.fn().mockRejectedValueOnce(Object.assign(new Error("throttle"), { name: "ThrottlingException" })).mockResolvedValue("ok");
    await expect(withCloudWatchLogsRetry(operation, { maxAttempts: 2, baseDelayMs: 1, backoffRate: 2, retryableErrors: ["ThrottlingException"] })).resolves.toBe("ok");
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it("builds naming, filter, redaction, audit, IAM, metric, subscription, cost, and DR plans", () => {
    const group = appLogGroupName("orders", "prod");
    expect(group).toBe("/aws/app/orders/prod");
    expect(safeLogStreamName("ecs", "task:1")).toBe("ecs/task-1");
    expect(jsonFilterPattern({ level: "ERROR", tenantId: "tenant-a" })).toContain("$.level");
    expect(redactSensitiveFields({ token: "secret", safe: "ok" })).toMatchObject({ token: "[REDACTED]", safe: "ok" });
    expect(enterpriseApplicationLog("INFO", "ok", { password: "pw" })).toMatchObject({ password: "[REDACTED]" });
    expect(buildLogAuditEntry({ eventId: "e1", actor: "ops", action: "FilterLogEvents", logGroupName: group, outcome: "ALLOW" }).at).toBeTruthy();
    expect(logGroupReadPolicy(group, "us-east-1", "123", "arn:role")).toMatchObject({ Version: "2012-10-17" });
    expect(metricFilterPlan({ filterName: "errors", logGroupName: group, filterPattern: "ERROR", metricNamespace: "App", metricName: "Errors", metricValue: "1", alarmThreshold: 1 })).toMatchObject({ metricName: "Errors" });
    expect(subscriptionFilterPlan({ filterName: "to-firehose", logGroupName: group, destinationArn: "arn:firehose", filterPattern: "", targetService: "firehose" })).toMatchObject({ targetService: "firehose" });
    expect(logCostOptimizationPlan(group, 11, 30)).toMatchObject({ samplingRecommended: true });
    expect(logDisasterRecoveryPlan("orders", "prod", "us-west-2").restoreRunbook).toHaveLength(4);
  });

  it("enforces lifecycle retention through CloudWatch Logs client", async () => {
    const { client, commands } = recordingClient();
    const plan = logLifecyclePlan("orders", "prod", true);
    await enforceLogRetention(plan, client);
    expect(commands[0]?.constructor.name).toBe("PutRetentionPolicyCommand");
  });
});
