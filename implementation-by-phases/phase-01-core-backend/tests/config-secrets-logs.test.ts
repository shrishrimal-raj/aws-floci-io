import { describe, expect, it } from "vitest";
import { CloudWatchJsonLogger, TaskFlowConfig, TaskFlowSecrets } from "../src/config-secrets-logs.js";

class FakeClient {
  commands: unknown[] = [];
  constructor(private readonly response: unknown = {}) {}
  async send(command: unknown) {
    this.commands.push(command);
    return this.response;
  }
}

describe("SSM, Secrets Manager, and CloudWatch Logs helpers", () => {
  it("reads hierarchical SSM parameters", async () => {
    const client = new FakeClient({ Parameter: { Value: "value" } });
    await expect(new TaskFlowConfig(client as never, "dev").get("api/base-url")).resolves.toBe("value");
    expect(client.commands[0]?.constructor.name).toBe("GetParameterCommand");
  });

  it("parses Secrets Manager JSON", async () => {
    const client = new FakeClient({ SecretString: JSON.stringify({ password: "secret" }) });
    await expect(new TaskFlowSecrets(client as never).json("db/creds")).resolves.toEqual({ password: "secret" });
  });

  it("writes structured JSON log events", async () => {
    const client = new FakeClient();
    await new CloudWatchJsonLogger(client as never).put({ level: "info", message: "created", tenantId: "tenant-a" });
    expect(client.commands[0]?.constructor.name).toBe("PutLogEventsCommand");
  });
});
