import {
  CreateFunctionCommand,
  DeleteFunctionCommand,
  GetFunctionCommand,
  InvokeCommand,
  UpdateFunctionCodeCommand,
  type InvocationType,
  type LambdaClient,
} from "@aws-sdk/client-lambda";
import { client as defaultClient } from "../client.js";
import { LambdaError } from "../errors.js";

export interface FunctionSpec {
  name: string;
  handler?: string;
  runtime?: "nodejs18.x" | "nodejs20.x";
  roleArn?: string;
  codeZip?: Uint8Array;
  environment?: Record<string, string>;
  timeoutSeconds?: number;
  memoryMb?: number;
}

export interface ApiHandlerResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

export interface InvocationResult<TPayload> {
  statusCode?: number;
  functionError?: string;
  payload: TPayload;
}

export const defaultZip = new Uint8Array([80, 75, 5, 6, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);

function awsErrorName(error: unknown): string {
  if (error instanceof LambdaError && error.cause instanceof Error) return error.cause.name;
  return error instanceof Error ? error.name : "";
}

function wrapError(operation: string, error: unknown): never {
  const code = awsErrorName(error) || "UNKNOWN";
  throw new LambdaError(code, `Lambda ${operation} failed`, error);
}

function encodePayload(payload: unknown): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(payload));
}

function decodePayload<TPayload>(payload?: Uint8Array): TPayload {
  const text = payload ? new TextDecoder().decode(payload) : "null";
  return JSON.parse(text) as TPayload;
}

/**
 * Create a Lambda function with runtime, handler, role, zip, env, timeout, and memory settings.
 *
 * @example
 * await createFunction({ name: "orders-worker", environment: { STAGE: "local" } });
 */
export async function createFunction(spec: FunctionSpec, lambda: LambdaClient = defaultClient) {
  try {
    return await lambda.send(
      new CreateFunctionCommand({
        FunctionName: spec.name,
        Runtime: spec.runtime ?? "nodejs20.x",
        Handler: spec.handler ?? "index.handler",
        Role: spec.roleArn ?? "arn:aws:iam::000000000000:role/lambda-role",
        Code: { ZipFile: spec.codeZip ?? defaultZip },
        Environment: spec.environment ? { Variables: spec.environment } : undefined,
        Timeout: spec.timeoutSeconds ?? 10,
        MemorySize: spec.memoryMb ?? 128,
      })
    );
  } catch (error) {
    if (awsErrorName(error) === "ResourceConflictException") return getFunction(spec.name, lambda);
    wrapError("createFunction", error);
  }
}

/**
 * Fetch Lambda configuration and code metadata.
 *
 * @example
 * const fn = await getFunction("orders-worker");
 */
export async function getFunction(name: string, lambda: LambdaClient = defaultClient) {
  try {
    return await lambda.send(new GetFunctionCommand({ FunctionName: name }));
  } catch (error) {
    wrapError("getFunction", error);
  }
}

/**
 * Update deployed Lambda zip bytes.
 *
 * @example
 * await updateFunctionCode("orders-worker", zipBytes);
 */
export async function updateFunctionCode(name: string, zip: Uint8Array = defaultZip, lambda: LambdaClient = defaultClient) {
  try {
    return await lambda.send(new UpdateFunctionCodeCommand({ FunctionName: name, ZipFile: zip }));
  } catch (error) {
    wrapError("updateFunctionCode", error);
  }
}

/**
 * Invoke Lambda synchronously and parse JSON payload.
 *
 * @example
 * const result = await invokeJson<{ ok: boolean }>("orders-worker", { orderId: "o1" });
 */
export async function invokeJson<TPayload = unknown>(
  name: string,
  payload: unknown = {},
  lambda: LambdaClient = defaultClient
): Promise<TPayload> {
  const result = await invokeForResult<TPayload>(name, payload, "RequestResponse", lambda);
  return result.payload;
}

/**
 * Invoke Lambda and return status code, function error, and parsed payload.
 *
 * @example
 * const result = await invokeForResult("orders-worker", { orderId: "o1" });
 */
export async function invokeForResult<TPayload = unknown>(
  name: string,
  payload: unknown = {},
  invocationType: InvocationType = "RequestResponse",
  lambda: LambdaClient = defaultClient
): Promise<InvocationResult<TPayload>> {
  try {
    const result = await lambda.send(
      new InvokeCommand({ FunctionName: name, InvocationType: invocationType, Payload: encodePayload(payload) })
    );
    return {
      statusCode: result.StatusCode,
      functionError: result.FunctionError,
      payload: decodePayload<TPayload>(result.Payload),
    };
  } catch (error) {
    wrapError("invokeForResult", error);
  }
}

/**
 * Fire-and-forget async invocation for event processing flows.
 *
 * @example
 * await invokeEvent("orders-worker", { orderId: "o1" });
 */
export async function invokeEvent(
  name: string,
  payload: unknown = {},
  lambda: LambdaClient = defaultClient
): Promise<InvocationResult<null>> {
  return invokeForResult<null>(name, payload, "Event", lambda);
}

/**
 * Delete Lambda function; undefined or missing functions are treated as cleaned up.
 *
 * @example
 * await deleteFunction("orders-worker");
 */
export async function deleteFunction(name: string | undefined, lambda: LambdaClient = defaultClient): Promise<void> {
  if (!name) return;
  try {
    await lambda.send(new DeleteFunctionCommand({ FunctionName: name }));
  } catch (error) {
    if (awsErrorName(error) === "ResourceNotFoundException") return;
    wrapError("deleteFunction", error);
  }
}

/**
 * Build API Gateway proxy-style JSON response for handlers.
 *
 * @example
 * return handlerResponse(200, { ok: true });
 */
export function handlerResponse(statusCode: number, body: unknown): ApiHandlerResponse {
  return { statusCode, headers: { "content-type": "application/json" }, body: JSON.stringify(body) };
}

/**
 * Build consistent error response without leaking internal error objects.
 *
 * @example
 * return handlerErrorResponse(500, "Internal error");
 */
export function handlerErrorResponse(statusCode: number, message: string): ApiHandlerResponse {
  return handlerResponse(statusCode, { error: message });
}
