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

export const passStateMachine = (result: unknown = { ok: true }) =>
  JSON.stringify({ Comment: "Floci pass workflow", StartAt: "Done", States: { Done: { Type: "Pass", Result: result, End: true } } });

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

export async function describeExecution(executionArn: string, sfn: SFNClient = defaultClient) {
  try {
    return await sfn.send(new DescribeExecutionCommand({ executionArn }));
  } catch (e) {
    return fail("describeExecution", e);
  }
}

export async function deleteStateMachine(stateMachineArn: string | undefined, sfn: SFNClient = defaultClient): Promise<void> {
  if (!stateMachineArn) return;
  try {
    await sfn.send(new DeleteStateMachineCommand({ stateMachineArn }));
  } catch (e) {
    if (e instanceof Error && e.name === "StateMachineDoesNotExist") return;
    return fail("deleteStateMachine", e);
  }
}
