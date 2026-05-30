import { describe, expect, it } from "vitest";
import { IdempotencyStore } from "../src/idempotency.js";

class FakeDocClient {
  commands: unknown[] = [];
  async send(command: unknown) {
    this.commands.push(command);
    return {};
  }
}

describe("DynamoDB idempotency store", () => {
  it("starts a new idempotent operation with TTL", async () => {
    const client = new FakeDocClient();
    await expect(new IdempotencyStore(client as never).begin("key-1", 60)).resolves.toBe("started");
    expect(client.commands[0]?.constructor.name).toBe("PutCommand");
  });

  it("marks operation completed with cached response", async () => {
    const client = new FakeDocClient();
    await new IdempotencyStore(client as never).complete("key-1", { id: "payment-1" });
    expect(client.commands[0]?.constructor.name).toBe("UpdateCommand");
  });

  it("marks operation failed with audit response", async () => {
    const client = new FakeDocClient();
    await new IdempotencyStore(client as never).fail("key-1", { reason: "validation" });
    expect(client.commands[0]?.constructor.name).toBe("UpdateCommand");
  });
});
