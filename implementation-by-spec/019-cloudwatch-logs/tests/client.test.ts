import { describe, it, expect, vi } from "vitest";
import type { CloudWatchLogsClient } from "@aws-sdk/client-cloudwatch-logs";
import { client } from "../src/client.js";
import type { CloudWatchLogsError } from "../src/errors.js";
import { createLogGroup, filterLogs, structuredLog } from "../src/use-cases/logs.js";

function failingClient(name: string): CloudWatchLogsClient {
  return { send: vi.fn(async () => { const error = new Error(`${name} failed`); error.name = name; throw error; }) } as unknown as CloudWatchLogsClient;
}

describe("CloudWatch Logs", () => {
  it("client is configured against Floci", () => expect(client).toBeDefined());
  it("supports local pure helpers", () => { expect(structuredLog("INFO", "ok", { requestId: "r1" })).toMatchObject({ level: "INFO", message: "ok", requestId: "r1" }); });
  it("wraps primary failures", async () => {
    await expect(createLogGroup("g", failingClient("AccessDeniedException"))).rejects.toMatchObject({ code: "CLOUDWATCH_LOGS_AccessDeniedException", message: "CloudWatch Logs createLogGroup failed" } satisfies Partial<CloudWatchLogsError>);
  });
  it("wraps secondary failures", async () => {
    await expect(filterLogs("g", "ERROR", failingClient("ResourceNotFoundException"))).rejects.toMatchObject({ code: "CLOUDWATCH_LOGS_ResourceNotFoundException", message: "CloudWatch Logs filterLogs failed" } satisfies Partial<CloudWatchLogsError>);
  });
});
