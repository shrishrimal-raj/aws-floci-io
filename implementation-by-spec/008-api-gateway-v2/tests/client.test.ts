import { describe, it, expect, beforeAll, vi } from "vitest";
import type { ApiGatewayV2Client } from "@aws-sdk/client-apigatewayv2";
import { waitForFloci } from "@floci-lab/test-utils";
import { client } from "../src/client.js";
import type { APIGatewayv2HTTPError } from "../src/errors.js";
import { buildHttpInvokeUrl, createHttpApi, createRoute, httpErrorResponse, httpResponse } from "../src/use-cases/http-api.js";

function failingClient(name: string): ApiGatewayV2Client {
  return {
    send: vi.fn(async () => {
      const error = new Error(`${name} failed`);
      error.name = name;
      throw error;
    }),
  } as unknown as ApiGatewayV2Client;
}

describe("API Gateway v2 HTTP", () => {
  beforeAll(async () => {
    await waitForFloci();
  });

  it("client is configured against Floci", () => {
    expect(client).toBeDefined();
  });

  it("builds HTTP API proxy responses", () => {
    expect(httpResponse(200, { ok: true })).toEqual({
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: '{"ok":true}',
    });
    expect(httpErrorResponse(403, "Forbidden").body).toBe('{"error":"Forbidden"}');
  });

  it("builds HTTP API invoke URLs", () => {
    expect(buildHttpInvokeUrl("abc123", "/health", "http://localhost:4566")).toBe(
      "http://localhost:4566/_aws/execute-api/abc123/health"
    );
    expect(buildHttpInvokeUrl("abc123", "orders", "http://localhost:4566/")).toBe(
      "http://localhost:4566/_aws/execute-api/abc123/orders"
    );
  });

  it("wraps SDK create failures in API Gateway v2 errors", async () => {
    await expect(createHttpApi("x", failingClient("AccessDeniedException"))).rejects.toMatchObject({
      code: "API_GATEWAY_V2_AccessDeniedException",
      message: "API Gateway v2 createHttpApi failed",
    } satisfies Partial<APIGatewayv2HTTPError>);
  });

  it("wraps SDK route failures in API Gateway v2 errors", async () => {
    await expect(createRoute("api", "GET /x", "integration", failingClient("NotFoundException"))).rejects.toMatchObject({
      code: "API_GATEWAY_V2_NotFoundException",
      message: "API Gateway v2 createRoute failed",
    } satisfies Partial<APIGatewayv2HTTPError>);
  });
});
