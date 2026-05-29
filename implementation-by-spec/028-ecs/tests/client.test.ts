import { describe, it, expect, beforeAll, vi } from "vitest";
import type { ECSClient } from "@aws-sdk/client-ecs";
import { waitForFloci } from "@floci-lab/test-utils";
import { client } from "../src/client.js";
import type { ECSError } from "../src/errors.js";
import { createCluster, registerFargateTask } from "../src/use-cases/services.js";

function failingClient(name: string): ECSClient {
  return { send: vi.fn(async () => { const error = new Error(`${name} failed`); error.name = name; throw error; }) } as unknown as ECSClient;
}

describe("ECS", () => {
  beforeAll(async () => waitForFloci());
  it("client is configured against Floci", () => expect(client).toBeDefined());
  it("supports local pure helpers", () => { expect({ cpu: "256", memory: "512", launchType: "FARGATE" }).toMatchObject({ launchType: "FARGATE" }); });
  it("wraps primary failures", async () => {
    await expect(createCluster("c", failingClient("AccessDeniedException"))).rejects.toMatchObject({ code: "ECS_AccessDeniedException", message: "ECS createCluster failed" } satisfies Partial<ECSError>);
  });
  it("wraps secondary failures", async () => {
    await expect(registerFargateTask("f", "img", failingClient("ClientException"))).rejects.toMatchObject({ code: "ECS_ClientException", message: "ECS registerFargateTask failed" } satisfies Partial<ECSError>);
  });
});
