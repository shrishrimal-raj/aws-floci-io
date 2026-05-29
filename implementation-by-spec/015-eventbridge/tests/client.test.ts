import { describe, it, expect, beforeAll, vi } from "vitest";
import type { EventBridgeClient } from "@aws-sdk/client-eventbridge";
import { waitForFloci } from "@floci-lab/test-utils";
import { client } from "../src/client.js";
import type { EventBridgeError } from "../src/errors.js";
import { eventPattern, publishEvent, putRule } from "../src/use-cases/events.js";

function failingClient(name: string): EventBridgeClient {
  return {
    send: vi.fn(async () => {
      const error = new Error(`${name} failed`);
      error.name = name;
      throw error;
    }),
  } as unknown as EventBridgeClient;
}

describe("EventBridge", () => {
  beforeAll(async () => waitForFloci());

  it("client is configured against Floci", () => expect(client).toBeDefined());

  it("builds event patterns", () => {
    expect(eventPattern("app", "created")).toEqual({ source: ["app"], "detail-type": ["created"] });
  });

  it("wraps rule failures in EventBridgeError", async () => {
    await expect(putRule("r", "bus", "app", "created", failingClient("AccessDeniedException"))).rejects.toMatchObject({
      code: "EVENTBRIDGE_AccessDeniedException",
      message: "EventBridge putRule failed",
    } satisfies Partial<EventBridgeError>);
  });

  it("wraps publish failures in EventBridgeError", async () => {
    await expect(publishEvent("bus", "app", "created", {}, failingClient("ResourceNotFoundException"))).rejects.toMatchObject({
      code: "EVENTBRIDGE_ResourceNotFoundException",
      message: "EventBridge publishEvent failed",
    } satisfies Partial<EventBridgeError>);
  });
});
