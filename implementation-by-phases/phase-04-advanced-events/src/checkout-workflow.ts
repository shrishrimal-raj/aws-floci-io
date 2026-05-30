import { StartExecutionCommand, type SFNClient } from "@aws-sdk/client-sfn";

export interface CheckoutInput {
  tenantId: string;
  cartId: string;
  userId: string;
  amountCents: number;
}

/**
 * Returns Step Functions ASL object for checkout saga.
 * Example: reserve inventory, authorize payment, place order, publish success, compensate failure.
 */
export function checkoutStateMachineDefinition(): Record<string, unknown> {
  return {
    Comment: "Commerce checkout saga",
    StartAt: "ReserveInventory",
    States: {
      ReserveInventory: {
        Type: "Task",
        Resource: "arn:aws:states:::lambda:invoke",
        Retry: [{ ErrorEquals: ["States.ALL"], IntervalSeconds: 1, MaxAttempts: 3, BackoffRate: 2 }],
        Catch: [{ ErrorEquals: ["States.ALL"], Next: "ReleaseInventory" }],
        Next: "AuthorizePayment",
      },
      AuthorizePayment: {
        Type: "Task",
        Resource: "arn:aws:states:::lambda:invoke",
        Retry: [{ ErrorEquals: ["Payment.Throttled"], IntervalSeconds: 2, MaxAttempts: 4, BackoffRate: 2 }],
        Catch: [{ ErrorEquals: ["States.ALL"], Next: "ReleaseInventory" }],
        Next: "PlaceOrder",
      },
      PlaceOrder: { Type: "Task", Resource: "arn:aws:states:::lambda:invoke", Next: "PublishOrderPlaced" },
      PublishOrderPlaced: { Type: "Task", Resource: "arn:aws:states:::events:putEvents", End: true },
      ReleaseInventory: { Type: "Task", Resource: "arn:aws:states:::lambda:invoke", Next: "PublishOrderFailed" },
      PublishOrderFailed: { Type: "Task", Resource: "arn:aws:states:::events:putEvents", End: true },
    },
  };
}

/** Counts ASL states; useful for tests and documentation drift checks. */
export function countStates(definition: Record<string, unknown>): number {
  const states = definition.States;
  return states && typeof states === "object" ? Object.keys(states).length : 0;
}

/**
 * Starts checkout state machine execution with safe execution name.
 * Example: API handler calls this after validating cart and tenant access.
 */
export class CheckoutWorkflow {
  constructor(private readonly sfn: SFNClient, private readonly stateMachineArn = process.env.CHECKOUT_STATE_MACHINE_ARN ?? "") {}

  async start(input: CheckoutInput): Promise<string | undefined> {
    const result = await this.sfn.send(
      new StartExecutionCommand({
        stateMachineArn: this.stateMachineArn,
        name: `${input.tenantId}-${input.cartId}-${Date.now()}`.replace(/[^a-zA-Z0-9-_]/g, "-"),
        input: JSON.stringify(input),
      })
    );
    return result.executionArn;
  }
}
