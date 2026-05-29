import { describe, it, expect, beforeAll, vi } from "vitest";
import type { LambdaClient } from "@aws-sdk/client-lambda";
import { waitForFloci } from "@floci-lab/test-utils";
import { client } from "../src/client.js";
import type { LambdaError } from "../src/errors.js";
import {
  createLambdaAuditEvent,
  estimateLambdaCost,
  handlerErrorResponse,
  handlerResponse,
  invokeForResult,
  invokeJson,
  invokeJsonWithRetry,
  parseApiJsonBody,
  requestContext,
  secureJsonResponse,
  serviceFunctionSpec,
  updateFunctionCode,
} from "../src/use-cases/functions.js";

function failingClient(name: string): LambdaClient {
  return {
    send: vi.fn(async () => {
      const error = new Error(`${name} failed`);
      error.name = name;
      throw error;
    }),
  } as unknown as LambdaClient;
}

function payloadClient(payload: unknown): LambdaClient {
  return {
    send: vi.fn(async () => ({
      StatusCode: 200,
      Payload: new TextEncoder().encode(JSON.stringify(payload)),
    })),
  } as unknown as LambdaClient;
}

describe("Lambda", () => {
  beforeAll(async () => {
    await waitForFloci();
  });

  it("client is configured against Floci", () => {
    expect(client).toBeDefined();
  });

  it("builds API-style handler responses", () => {
    expect(handlerResponse(200, { ok: true })).toEqual({
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: '{"ok":true}',
    });
    expect(handlerErrorResponse(404, "Not found")).toEqual({
      statusCode: 404,
      headers: { "content-type": "application/json" },
      body: '{"error":"Not found"}',
    });
    expect(
      secureJsonResponse(200, { ok: true }, "https://app.example.com").headers,
    ).toMatchObject({
      "access-control-allow-origin": "https://app.example.com",
      "x-content-type-options": "nosniff",
    });
  });

  it("builds service specs, parses API bodies, context, audit, and cost", () => {
    const spec = serviceFunctionSpec(
      "orders",
      { ORDERS_TABLE: "orders" },
      { memoryMb: 512 },
    );
    expect(spec.environment?.ORDERS_TABLE).toBe("orders");
    expect(spec.memoryMb).toBe(512);

    const event = {
      body: '{"orderId":"o1"}',
      headers: { "x-correlation-id": "trace-1" },
      requestContext: {
        requestId: "req-1",
        authorizer: { claims: { tenantId: "tenant-1" } },
      },
    };
    expect(parseApiJsonBody<{ orderId: string }>(event).orderId).toBe("o1");
    expect(requestContext(event)).toEqual({
      requestId: "req-1",
      tenantId: "tenant-1",
      traceId: "trace-1",
    });
    expect(
      createLambdaAuditEvent({
        functionName: "orders",
        action: "CreateOrder",
        outcome: "SUCCESS",
      }).eventId,
    ).toContain("lambda-");
    expect(
      estimateLambdaCost({
        requests: 2_000_000,
        durationMs: 100,
        memoryMb: 512,
      }).billableRequests,
    ).toBe(1_000_000);
  });

  it("parses JSON invocation payloads", async () => {
    await expect(
      invokeJson<{ ok: boolean }>(
        "fn",
        { ping: true },
        payloadClient({ ok: true }),
      ),
    ).resolves.toEqual({
      ok: true,
    });

    await expect(
      invokeForResult("fn", {}, "RequestResponse", payloadClient({ ok: true })),
    ).resolves.toMatchObject({
      statusCode: 200,
      payload: { ok: true },
    });

    await expect(
      invokeJsonWithRetry<{ ok: boolean }>(
        "fn",
        { ping: true },
        { attempts: 2, baseDelayMs: 1 },
        payloadClient({ ok: true }),
      ),
    ).resolves.toEqual({ ok: true });
  });

  it("wraps SDK invoke failures in LambdaError", async () => {
    await expect(
      invokeJson("fn", {}, failingClient("ResourceNotFoundException")),
    ).rejects.toMatchObject({
      code: "LAMBDA_ResourceNotFoundException",
      message: "Lambda invokeForResult failed",
    } satisfies Partial<LambdaError>);
  });

  it("wraps SDK update failures in LambdaError", async () => {
    await expect(
      updateFunctionCode(
        "fn",
        undefined,
        failingClient("AccessDeniedException"),
      ),
    ).rejects.toMatchObject({
      code: "LAMBDA_AccessDeniedException",
      message: "Lambda updateFunctionCode failed",
    } satisfies Partial<LambdaError>);
  });
});
