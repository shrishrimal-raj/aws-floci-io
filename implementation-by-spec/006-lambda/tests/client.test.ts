import { describe, it, expect, beforeAll, vi } from "vitest";
import type { LambdaClient } from "@aws-sdk/client-lambda";
import { waitForFloci } from "@floci-lab/test-utils";
import { client } from "../src/client.js";
import type { LambdaError } from "../src/errors.js";
import {
  handlerErrorResponse,
  handlerResponse,
  invokeForResult,
  invokeJson,
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
  });

  it("parses JSON invocation payloads", async () => {
    await expect(invokeJson<{ ok: boolean }>("fn", { ping: true }, payloadClient({ ok: true }))).resolves.toEqual({
      ok: true,
    });

    await expect(invokeForResult("fn", {}, "RequestResponse", payloadClient({ ok: true }))).resolves.toMatchObject({
      statusCode: 200,
      payload: { ok: true },
    });
  });

  it("wraps SDK invoke failures in LambdaError", async () => {
    await expect(invokeJson("fn", {}, failingClient("ResourceNotFoundException"))).rejects.toMatchObject({
      code: "LAMBDA_ResourceNotFoundException",
      message: "Lambda invokeForResult failed",
    } satisfies Partial<LambdaError>);
  });

  it("wraps SDK update failures in LambdaError", async () => {
    await expect(updateFunctionCode("fn", undefined, failingClient("AccessDeniedException"))).rejects.toMatchObject({
      code: "LAMBDA_AccessDeniedException",
      message: "Lambda updateFunctionCode failed",
    } satisfies Partial<LambdaError>);
  });
});
