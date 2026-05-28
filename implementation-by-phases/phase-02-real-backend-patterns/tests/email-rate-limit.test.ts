import { describe, expect, it } from "vitest";
import { SesMailer, SesV2Mailer } from "../src/email.js";
import { consumeToken } from "../src/rate-limit.js";

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
    const first = consumeToken({ capacity: 2, tokens: 1, refillPerSecond: 1, updatedAtMs: 0 }, 0);
    expect(first.allowed).toBe(true);
    const second = consumeToken(first.state, 0);
    expect(second.allowed).toBe(false);
    const third = consumeToken(second.state, 1000);
    expect(third.allowed).toBe(true);
  });
});
