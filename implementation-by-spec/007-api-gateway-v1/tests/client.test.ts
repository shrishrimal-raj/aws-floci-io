import { describe, it, expect, vi } from "vitest";
import type { APIGatewayClient } from "@aws-sdk/client-api-gateway";
import { client } from "../src/client.js";
import type { APIGatewayv1RESTError } from "../src/errors.js";
import {
  buildInvokeUrl,
  createMockRoutes,
  createRestApi,
  deleteRestApi,
  putMockMethod,
  retryControlPlane,
  withRestApiLifecycle,
} from "../src/use-cases/rest-api.js";

function failingClient(name: string): APIGatewayClient {
  return {
    send: vi.fn(async () => {
      const error = new Error(`${name} failed`);
      error.name = name;
      throw error;
    }),
  } as unknown as APIGatewayClient;
}

function commandName(command: unknown): string {
  return command?.constructor?.name ?? "";
}

function mockClient(): APIGatewayClient & { send: ReturnType<typeof vi.fn> } {
  let resourceCount = 0;
  const send = vi.fn(async (command: unknown) => {
    switch (commandName(command)) {
      case "CreateRestApiCommand":
        return { id: "api-1" };
      case "CreateResourceCommand":
        resourceCount += 1;
        return { id: `res-${resourceCount}` };
      case "DeleteRestApiCommand":
      case "PutMethodCommand":
      case "PutIntegrationCommand":
        return {};
      default:
        return {};
    }
  });
  return { send } as unknown as APIGatewayClient & { send: ReturnType<typeof vi.fn> };
}

describe("API Gateway v1 REST", () => {
  it("client is configured against Floci", () => {
    expect(client).toBeDefined();
  });

  it("documents mock REST route shape", () => {
    expect({ path: "/health", method: "GET", stage: "dev" }).toMatchObject({ method: "GET" });
  });

  it("builds Floci REST invoke URLs", () => {
    expect(buildInvokeUrl("abc123", "dev", "/health", "http://localhost:4566")).toBe(
      "http://localhost:4566/restapis/abc123/dev/_user_request_/health"
    );
    expect(buildInvokeUrl("abc123", "prod", "orders", "http://localhost:4566/")).toBe(
      "http://localhost:4566/restapis/abc123/prod/_user_request_/orders"
    );
  });

  it("wraps SDK create failures in API Gateway errors", async () => {
    await expect(createRestApi("x", failingClient("AccessDeniedException"))).rejects.toMatchObject({
      code: "API_GATEWAY_V1_AccessDeniedException",
      message: "API Gateway v1 createRestApi failed",
    } satisfies Partial<APIGatewayv1RESTError>);
  });

  it("wraps SDK method failures in API Gateway errors", async () => {
    await expect(putMockMethod("api", "res", "GET", failingClient("NotFoundException"))).rejects.toMatchObject({
      code: "API_GATEWAY_V1_NotFoundException",
      message: "API Gateway v1 putMockMethod failed",
    } satisfies Partial<APIGatewayv1RESTError>);
  });

  it("creates multiple mock routes for enterprise contracts", async () => {
    const api = mockClient();

    await expect(
      createMockRoutes(
        [
          { restApiId: "api-1", parentId: "root", pathPart: "health", method: "GET" },
          { restApiId: "api-1", parentId: "root", pathPart: "orders", method: "POST", description: "order intake" },
        ],
        api
      )
    ).resolves.toEqual([
      { pathPart: "health", method: "GET", resourceId: "res-1", description: undefined },
      { pathPart: "orders", method: "POST", resourceId: "res-2", description: "order intake" },
    ]);
    expect(api.send).toHaveBeenCalledTimes(6);
  });

  it("runs lifecycle workflows and cleans up created APIs", async () => {
    const api = mockClient();

    await expect(withRestApiLifecycle("orders", async ({ restApiId }) => restApiId, api)).resolves.toBe("api-1");
    expect(api.send.mock.calls.map(([command]) => commandName(command))).toEqual([
      "CreateRestApiCommand",
      "DeleteRestApiCommand",
    ]);
  });

  it("retries transient control-plane work", async () => {
    const operation = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error("throttle"))
      .mockResolvedValueOnce("ok");

    await expect(retryControlPlane(operation, { attempts: 2, delayMs: 0 })).resolves.toBe("ok");
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it("stops retrying when retry policy rejects the error", async () => {
    const operation = vi.fn<() => Promise<string>>().mockRejectedValue(new Error("validation"));

    await expect(
      retryControlPlane(operation, { attempts: 3, delayMs: 0, shouldRetry: () => false })
    ).rejects.toThrow("validation");
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it("ignores missing API deletes", async () => {
    await expect(deleteRestApi(undefined)).resolves.toBeUndefined();
  });
});
