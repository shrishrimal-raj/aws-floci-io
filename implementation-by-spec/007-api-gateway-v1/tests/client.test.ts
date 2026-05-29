import { describe, it, expect, beforeAll, vi } from "vitest";
import type { APIGatewayClient } from "@aws-sdk/client-api-gateway";
import { waitForFloci } from "@floci-lab/test-utils";
import { client } from "../src/client.js";
import type { APIGatewayv1RESTError } from "../src/errors.js";
import { buildInvokeUrl, createRestApi, deleteRestApi, putMockMethod } from "../src/use-cases/rest-api.js";

function failingClient(name: string): APIGatewayClient {
  return {
    send: vi.fn(async () => {
      const error = new Error(`${name} failed`);
      error.name = name;
      throw error;
    }),
  } as unknown as APIGatewayClient;
}

describe("API Gateway v1 REST", () => {
  beforeAll(async () => {
    await waitForFloci();
  });

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

  it("ignores missing API deletes", async () => {
    await expect(deleteRestApi(undefined)).resolves.toBeUndefined();
  });
});
