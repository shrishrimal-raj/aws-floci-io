import {
  CreateStateMachineCommand,
  DeleteStateMachineCommand,
  DescribeExecutionCommand,
  SFNClient,
  StartExecutionCommand,
} from "@aws-sdk/client-sfn";
import { client as defaultClient } from "../client.js";
import { StepFunctionsError } from "../errors.js";

const fail = (op: string, e: unknown): never => {
  throw new StepFunctionsError(e instanceof Error && e.name ? e.name : "UNKNOWN", `Step Functions ${op} failed`, e);
};

function requireValue(value: string | undefined, label: string): string {
  if (!value) throw new Error(`${label} missing`);
  return value;
}

export interface TaskRetryPolicy {
  errorEquals?: string[];
  intervalSeconds?: number;
  maxAttempts?: number;
  backoffRate?: number;
}

export interface LambdaTaskStateInput {
  name: string;
  functionArn: string;
  resultPath?: string;
  timeoutSeconds?: number;
  retry?: TaskRetryPolicy;
  catchNext?: string;
  end?: boolean;
  next?: string;
}

export interface ChoiceRuleInput {
  variable: string;
  stringEquals: string;
  next: string;
}

/**
 * Builds a minimal Amazon States Language Pass workflow for smoke tests and local labs.
 * Example: onboarding tests create a no-op state machine to verify IAM, deployment, and execution permissions.
 */
export const passStateMachine = (result: unknown = { ok: true }) =>
  JSON.stringify({ Comment: "Floci pass workflow", StartAt: "Done", States: { Done: { Type: "Pass", Result: result, End: true } } });

/**
 * Builds a Lambda task state with retry/catch/timeout settings for production workflows.
 * Example: payment capture task retries Lambda service errors and routes business failures to compensation.
 */
export function lambdaTaskState(input: LambdaTaskStateInput): Record<string, unknown> {
  return {
    Type: "Task",
    Resource: "arn:aws:states:::lambda:invoke",
    Parameters: { FunctionName: input.functionArn, "Payload.$": "$" },
    ResultPath: input.resultPath ?? `$.${input.name}`,
    TimeoutSeconds: input.timeoutSeconds ?? 30,
    Retry: [
      {
        ErrorEquals: input.retry?.errorEquals ?? ["Lambda.ServiceException", "Lambda.AWSLambdaException", "Lambda.SdkClientException", "States.Timeout"],
        IntervalSeconds: input.retry?.intervalSeconds ?? 2,
        MaxAttempts: input.retry?.maxAttempts ?? 3,
        BackoffRate: input.retry?.backoffRate ?? 2,
      },
    ],
    Catch: input.catchNext ? [{ ErrorEquals: ["States.ALL"], ResultPath: "$.error", Next: input.catchNext }] : undefined,
    End: input.end,
    Next: input.next,
  };
}

/**
 * Builds a choice state for request validation, routing, and compensation branches.
 * Example: order workflow routes VIP orders to manual review and normal orders to fulfillment.
 */
export function choiceState(choices: ChoiceRuleInput[], defaultNext: string): Record<string, unknown> {
  return {
    Type: "Choice",
    Choices: choices.map((choice) => ({ Variable: choice.variable, StringEquals: choice.stringEquals, Next: choice.next })),
    Default: defaultNext,
  };
}

/**
 * Builds a realistic order-processing workflow with validation, payment, fulfillment, audit, and failure compensation.
 * Example: ecommerce backend orchestrates Lambda tasks while keeping retries and failure paths visible in ASL.
 */
export function orderProcessingStateMachine(input: { validateArn: string; paymentArn: string; fulfillmentArn: string; auditArn: string; compensateArn: string }): string {
  return JSON.stringify({
    Comment: "Enterprise order processing workflow",
    StartAt: "ValidateOrder",
    States: {
      ValidateOrder: lambdaTaskState({ name: "validation", functionArn: input.validateArn, resultPath: "$.validation", next: "Payment" }),
      Payment: lambdaTaskState({ name: "payment", functionArn: input.paymentArn, resultPath: "$.payment", catchNext: "CompensateOrder", next: "FulfillOrder" }),
      FulfillOrder: lambdaTaskState({ name: "fulfillment", functionArn: input.fulfillmentArn, resultPath: "$.fulfillment", catchNext: "CompensateOrder", next: "AuditSuccess" }),
      AuditSuccess: lambdaTaskState({ name: "audit", functionArn: input.auditArn, resultPath: "$.audit", end: true }),
      CompensateOrder: lambdaTaskState({ name: "compensation", functionArn: input.compensateArn, resultPath: "$.compensation", end: true }),
    },
  });
}

/**
 * Creates a STANDARD state machine and returns its ARN.
 * Example: deployment script provisions `orders-prod` from a generated ASL definition and execution role.
 */
export async function createStateMachine(
  name: string,
  definition = passStateMachine(),
  roleArn = "arn:aws:iam::000000000000:role/sfn-role",
  sfn: SFNClient = defaultClient
): Promise<string> {
  try {
    const result = await sfn.send(new CreateStateMachineCommand({ name, definition, roleArn, type: "STANDARD" }));
    return requireValue(result.stateMachineArn, "stateMachineArn");
  } catch (e) {
    return fail("createStateMachine", e);
  }
}

/**
 * Starts a workflow execution with JSON input and returns execution ARN.
 * Example: API Gateway/Lambda starts order workflow with tenantId, orderId, correlationId, and requestId.
 */
export async function startExecution(
  stateMachineArn: string,
  input: unknown = {},
  sfn: SFNClient = defaultClient
): Promise<string> {
  try {
    const result = await sfn.send(new StartExecutionCommand({ stateMachineArn, input: JSON.stringify(input) }));
    return requireValue(result.executionArn, "executionArn");
  } catch (e) {
    return fail("startExecution", e);
  }
}

/**
 * Reads execution status/history summary from Step Functions.
 * Example: operations dashboard polls execution status to show running, succeeded, failed, or timed out orders.
 */
export async function describeExecution(executionArn: string, sfn: SFNClient = defaultClient) {
  try {
    return await sfn.send(new DescribeExecutionCommand({ executionArn }));
  } catch (e) {
    return fail("describeExecution", e);
  }
}

/**
 * Deletes a state machine; undefined/missing ARNs are ignored for safe cleanup scripts.
 * Example: CI teardown calls this after integration tests even when setup partially failed.
 */
export async function deleteStateMachine(stateMachineArn: string | undefined, sfn: SFNClient = defaultClient): Promise<void> {
  if (!stateMachineArn) return;
  try {
    await sfn.send(new DeleteStateMachineCommand({ stateMachineArn }));
  } catch (e) {
    if (e instanceof Error && e.name === "StateMachineDoesNotExist") return;
    return fail("deleteStateMachine", e);
  }
}
