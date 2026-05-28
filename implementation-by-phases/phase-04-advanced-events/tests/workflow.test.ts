import { describe, expect, it } from "vitest";
import { CheckoutWorkflow, checkoutStateMachineDefinition, countStates } from "../src/checkout-workflow.js";

class FakeClient {
  commands: unknown[] = [];
  async send(command: unknown) {
    this.commands.push(command);
    return { executionArn: "arn:aws:states:us-east-1:123:execution:checkout:1" };
  }
}

describe("Step Functions checkout saga", () => {
  it("defines orchestration with compensation path", () => {
    const definition = checkoutStateMachineDefinition();
    expect(countStates(definition)).toBe(6);
    expect(JSON.stringify(definition)).toContain("ReleaseInventory");
    expect(JSON.stringify(definition)).toContain("PublishOrderPlaced");
  });

  it("starts checkout execution", async () => {
    const client = new FakeClient();
    await expect(new CheckoutWorkflow(client as never, "arn:checkout").start({ tenantId: "t", cartId: "c", userId: "u", amountCents: 100 })).resolves.toContain("execution");
    expect(client.commands[0]?.constructor.name).toBe("StartExecutionCommand");
  });
});
