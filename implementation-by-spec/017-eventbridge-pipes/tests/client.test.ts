import { describe, it, expect, beforeAll, vi } from "vitest";
import type { PipesClient } from "@aws-sdk/client-pipes";
import { waitForFloci } from "@floci-lab/test-utils";
import { client } from "../src/client.js";
import type { EventBridgePipesError } from "../src/errors.js";
import { createPipe, describePipe, sqsToEventBusFilter } from "../src/use-cases/pipes.js";

function failingClient(name: string): PipesClient {
  return { send: vi.fn(async () => { const error = new Error(`${name} failed`); error.name = name; throw error; }) } as unknown as PipesClient;
}

describe("EventBridge Pipes", () => {
  beforeAll(async () => waitForFloci());
  it("client is configured against Floci", () => expect(client).toBeDefined());
  it("supports local pure helpers", () => { expect(sqsToEventBusFilter("created")).toEqual({ body: { eventType: ["created"] } }); });
  it("wraps primary failures", async () => {
    await expect(createPipe({ name: "p", sourceArn: "s", targetArn: "t", roleArn: "r" }, failingClient("AccessDeniedException"))).rejects.toMatchObject({ code: "EVENTBRIDGE_PIPES_AccessDeniedException", message: "EventBridge Pipes createPipe failed" } satisfies Partial<EventBridgePipesError>);
  });
  it("wraps secondary failures", async () => {
    await expect(describePipe("p", failingClient("ResourceNotFoundException"))).rejects.toMatchObject({ code: "EVENTBRIDGE_PIPES_ResourceNotFoundException", message: "EventBridge Pipes describePipe failed" } satisfies Partial<EventBridgePipesError>);
  });
});
