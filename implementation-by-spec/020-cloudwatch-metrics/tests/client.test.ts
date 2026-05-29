import { describe, it, expect, beforeAll, vi } from "vitest";
import type { CloudWatchClient } from "@aws-sdk/client-cloudwatch";
import { waitForFloci } from "@floci-lab/test-utils";
import { client } from "../src/client.js";
import type { CloudWatchMetricsError } from "../src/errors.js";
import { putMetric, putAlarm, emfMetric } from "../src/use-cases/metrics.js";

function failingClient(name: string): CloudWatchClient {
  return { send: vi.fn(async () => { const error = new Error(`${name} failed`); error.name = name; throw error; }) } as unknown as CloudWatchClient;
}

describe("CloudWatch Metrics", () => {
  beforeAll(async () => waitForFloci());
  it("client is configured against Floci", () => expect(client).toBeDefined());
  it("supports local pure helpers", () => { expect(emfMetric("App", { Count: 1 }, { Service: "api" })._aws.CloudWatchMetrics[0]?.Namespace).toBe("App"); });
  it("wraps primary failures", async () => {
    await expect(putMetric("App", "Count", 1, "Count", {}, failingClient("AccessDeniedException"))).rejects.toMatchObject({ code: "CLOUDWATCH_METRICS_AccessDeniedException", message: "CloudWatch Metrics putMetric failed" } satisfies Partial<CloudWatchMetricsError>);
  });
  it("wraps secondary failures", async () => {
    await expect(putAlarm("Alarm", "App", "Errors", 1, failingClient("ValidationError"))).rejects.toMatchObject({ code: "CLOUDWATCH_METRICS_ValidationError", message: "CloudWatch Metrics putAlarm failed" } satisfies Partial<CloudWatchMetricsError>);
  });
});
