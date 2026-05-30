import { describe, expect, it } from "vitest";
import { SesMailer, SesV2Mailer, webhookFailureEmail } from "../src/email.js";
import { consumeToken, createTokenBucket, retryAfterSeconds } from "../src/rate-limit.js";

class FakeClient {
  commands: unknown[] = [];
  async send(command: unknown) {
    this.commands.push(command);
    return {};
  }
}

describe("SES mailers and tenant rate limits", () => {
  it("sends SES v1 command", async () => {
    const client = new FakeClient();
    await new SesMailer(client as never).send({ from: "a@example.com", to: "b@example.com", subject: "Hi", text: "Hello" });
    expect(client.commands[0]?.constructor.name).toBe("SendEmailCommand");
  });

  it("sends SES v2 command", async () => {
    const client = new FakeClient();
    await new SesV2Mailer(client as never).send({ from: "a@example.com", to: "b@example.com", subject: "Hi", text: "Hello" });
    expect(client.commands[0]?.constructor.name).toBe("SendEmailCommand");
  });

  it("uses token bucket for per-tenant rate limits", () => {
    expect(createTokenBucket(2, 1, 0)).toEqual({ capacity: 2, tokens: 2, refillPerSecond: 1, updatedAtMs: 0 });
    const first = consumeToken({ capacity: 2, tokens: 1, refillPerSecond: 1, updatedAtMs: 0 }, 0);
    expect(first.allowed).toBe(true);
    const second = consumeToken(first.state, 0);
    expect(second.allowed).toBe(false);
    expect(retryAfterSeconds(second.state)).toBe(1);
    const third = consumeToken(second.state, 1000);
    expect(third.allowed).toBe(true);
  });

  it("builds webhook failure email without payload secrets", () => {
    expect(
      webhookFailureEmail({ from: "alerts@example.com", to: "admin@example.com", tenantId: "tenant-a", endpointId: "endpoint-a", eventId: "evt-1", statusCode: 503 })
    ).toMatchObject({ subject: "[TaskFlow] Webhook delivery failed for endpoint-a" });
  });
});
