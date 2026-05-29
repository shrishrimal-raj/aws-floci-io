import { describe, it, expect, beforeAll, vi } from "vitest";
import type { SFNClient } from "@aws-sdk/client-sfn";
import { waitForFloci } from "@floci-lab/test-utils";
import { client } from "../src/client.js";
import type { StepFunctionsError } from "../src/errors.js";
import { createStateMachine, describeExecution, passStateMachine } from "../src/use-cases/workflows.js";

function failingClient(name: string): SFNClient {
  return { send: vi.fn(async () => { const error = new Error(`${name} failed`); error.name = name; throw error; }) } as unknown as SFNClient;
}

describe("Step Functions", () => {
  beforeAll(async () => waitForFloci());
  it("client is configured against Floci", () => expect(client).toBeDefined());
  it("supports local pure helpers", () => { expect(JSON.parse(passStateMachine({ ok: true })).States.Done.Type).toBe("Pass"); });
  it("wraps primary failures", async () => {
    await expect(createStateMachine("sm", passStateMachine(), "role", failingClient("AccessDeniedException"))).rejects.toMatchObject({ code: "STEP_FUNCTIONS_AccessDeniedException", message: "Step Functions createStateMachine failed" } satisfies Partial<StepFunctionsError>);
  });
  it("wraps secondary failures", async () => {
    await expect(describeExecution("exec", failingClient("ExecutionDoesNotExist"))).rejects.toMatchObject({ code: "STEP_FUNCTIONS_ExecutionDoesNotExist", message: "Step Functions describeExecution failed" } satisfies Partial<StepFunctionsError>);
  });
});
