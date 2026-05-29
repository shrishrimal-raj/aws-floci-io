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

export interface RetryOptions {
  attempts?: number;
  baseDelayMs?: number;
  shouldRetry?: (error: unknown) => boolean;
}

export interface ApiGatewayEventLike {
  body?: string | null;
  headers?: Record<string, string | undefined>;
  requestContext?: {
    requestId?: string;
    authorizer?: { claims?: Record<string, string> };
  };
}

export interface LambdaAuditEvent {
  eventId: string;
  timestamp: string;
  functionName: string;
  action: string;
  outcome: "SUCCESS" | "ERROR" | "DENY" | "RETRY";
  requestId?: string;
  tenantId?: string;
  traceId?: string;
  reason?: string;
}

export interface LambdaCostEstimateInput {
  requests: number;
  durationMs: number;
  memoryMb: number;
  requestUsdPerMillion?: number;
  gbSecondUsd?: number;
  freeRequests?: number;
  freeGbSeconds?: number;
}

export interface LambdaCostEstimate {
  billableRequests: number;
  computeGbSeconds: number;
  billableGbSeconds: number;
  requestUsd: number;
  computeUsd: number;
  totalUsd: number;
}

export const defaultZip = new Uint8Array([
  80, 75, 5, 6, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
]);

function awsErrorName(error: unknown): string {
  if (error instanceof LambdaError && error.cause instanceof Error)
    return error.cause.name;
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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function defaultShouldRetry(error: unknown): boolean {
  const name = awsErrorName(error);
  return [
    "TooManyRequestsException",
    "ServiceException",
    "EC2ThrottledException",
    "InternalError",
    "RequestTimeout",
  ].includes(name);
}

/**
 * Build standard function spec for environment-aware backend services.
 *
 * @example
 * const spec = serviceFunctionSpec("orders-worker", { ORDERS_TABLE: "orders" });
 */
export function serviceFunctionSpec(
  name: string,
  environment: Record<string, string> = {},
  overrides: Omit<FunctionSpec, "name" | "environment"> = {},
): FunctionSpec {
  return {
    name,
    runtime: "nodejs20.x",
    handler: "index.handler",
    timeoutSeconds: 10,
    memoryMb: 256,
    ...overrides,
    environment: {
      NODE_ENV: process.env.NODE_ENV ?? "development",
      LOG_LEVEL: process.env.LOG_LEVEL ?? "info",
      ...environment,
    },
  };
}

/**
 * Parse API Gateway JSON body and throw a safe LambdaError for invalid input.
 *
 * @example
 * const body = parseApiJsonBody<{ orderId: string }>(event);
 */
export function parseApiJsonBody<TBody>(event: ApiGatewayEventLike): TBody {
  if (!event.body)
    throw new LambdaError("VALIDATION", "request body is required");
  try {
    return JSON.parse(event.body) as TBody;
  } catch (error) {
    throw new LambdaError(
      "VALIDATION",
      "request body must be valid JSON",
      error,
    );
  }
}

/**
 * Extract common request context used for audit logging and tenant authorization.
 *
 * @example
 * const ctx = requestContext(event);
 */
export function requestContext(event: ApiGatewayEventLike): {
  requestId?: string;
  tenantId?: string;
  traceId?: string;
} {
  const claims = event.requestContext?.authorizer?.claims;
  return {
    requestId: event.requestContext?.requestId,
    tenantId: claims?.tenantId,
    traceId:
      event.headers?.["x-correlation-id"] ??
      event.headers?.["X-Correlation-Id"],
  };
}

/**
 * Build structured audit event for Lambda logs or downstream audit sinks.
 *
 * @example
 * createLambdaAuditEvent({ functionName: "orders-api", action: "CreateOrder", outcome: "SUCCESS" });
 */
export function createLambdaAuditEvent(
  input: Omit<LambdaAuditEvent, "eventId" | "timestamp">,
): LambdaAuditEvent {
  return {
    eventId: `lambda-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    timestamp: new Date().toISOString(),
    ...input,
  };
}

/**
 * Estimate request and compute cost for Lambda architecture decisions.
 * Defaults are illustrative; verify live AWS Pricing before production use.
 *
 * @example
 * estimateLambdaCost({ requests: 5_000_000, durationMs: 120, memoryMb: 512 });
 */
export function estimateLambdaCost(
  input: LambdaCostEstimateInput,
): LambdaCostEstimate {
  const billableRequests = Math.max(
    0,
    input.requests - (input.freeRequests ?? 1_000_000),
  );
  const computeGbSeconds =
    input.requests * (input.durationMs / 1000) * (input.memoryMb / 1024);
  const billableGbSeconds = Math.max(
    0,
    computeGbSeconds - (input.freeGbSeconds ?? 400_000),
  );
  const requestUsd =
    (billableRequests / 1_000_000) * (input.requestUsdPerMillion ?? 0.2);
  const computeUsd = billableGbSeconds * (input.gbSecondUsd ?? 0.0000166667);
  return {
    billableRequests,
    computeGbSeconds,
    billableGbSeconds,
    requestUsd,
    computeUsd,
    totalUsd: requestUsd + computeUsd,
  };
}

/**
 * Create a Lambda function with runtime, handler, role, zip, env, timeout, and memory settings.
 *
 * @example
 * await createFunction({ name: "orders-worker", environment: { STAGE: "local" } });
 */
export async function createFunction(
  spec: FunctionSpec,
  lambda: LambdaClient = defaultClient,
) {
  try {
    return await lambda.send(
      new CreateFunctionCommand({
        FunctionName: spec.name,
        Runtime: spec.runtime ?? "nodejs20.x",
        Handler: spec.handler ?? "index.handler",
        Role: spec.roleArn ?? "arn:aws:iam::000000000000:role/lambda-role",
        Code: { ZipFile: spec.codeZip ?? defaultZip },
        Environment: spec.environment
          ? { Variables: spec.environment }
          : undefined,
        Timeout: spec.timeoutSeconds ?? 10,
        MemorySize: spec.memoryMb ?? 128,
      }),
    );
  } catch (error) {
    if (awsErrorName(error) === "ResourceConflictException")
      return getFunction(spec.name, lambda);
    wrapError("createFunction", error);
  }
}

/**
 * Fetch Lambda configuration and code metadata.
 *
 * @example
 * const fn = await getFunction("orders-worker");
 */
export async function getFunction(
  name: string,
  lambda: LambdaClient = defaultClient,
) {
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
export async function updateFunctionCode(
  name: string,
  zip: Uint8Array = defaultZip,
  lambda: LambdaClient = defaultClient,
) {
  try {
    return await lambda.send(
      new UpdateFunctionCodeCommand({ FunctionName: name, ZipFile: zip }),
    );
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
  lambda: LambdaClient = defaultClient,
): Promise<TPayload> {
  const result = await invokeForResult<TPayload>(
    name,
    payload,
    "RequestResponse",
    lambda,
  );
  return result.payload;
}

/**
 * Invoke synchronously with bounded retry for throttling/transient platform failures.
 *
 * @example
 * const result = await invokeJsonWithRetry("orders-worker", { orderId: "o1" });
 */
export async function invokeJsonWithRetry<TPayload = unknown>(
  name: string,
  payload: unknown = {},
  options: RetryOptions = {},
  lambda: LambdaClient = defaultClient,
): Promise<TPayload> {
  const attempts = options.attempts ?? 3;
  const baseDelayMs = options.baseDelayMs ?? 100;
  const shouldRetry = options.shouldRetry ?? defaultShouldRetry;
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await invokeJson<TPayload>(name, payload, lambda);
    } catch (error) {
      lastError = error;
      if (attempt === attempts || !shouldRetry(error)) throw error;
      await sleep(baseDelayMs * 2 ** (attempt - 1));
    }
  }

  throw lastError;
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
  lambda: LambdaClient = defaultClient,
): Promise<InvocationResult<TPayload>> {
  try {
    const result = await lambda.send(
      new InvokeCommand({
        FunctionName: name,
        InvocationType: invocationType,
        Payload: encodePayload(payload),
      }),
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
  lambda: LambdaClient = defaultClient,
): Promise<InvocationResult<null>> {
  return invokeForResult<null>(name, payload, "Event", lambda);
}

/**
 * Delete Lambda function; undefined or missing functions are treated as cleaned up.
 *
 * @example
 * await deleteFunction("orders-worker");
 */
export async function deleteFunction(
  name: string | undefined,
  lambda: LambdaClient = defaultClient,
): Promise<void> {
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
export function handlerResponse(
  statusCode: number,
  body: unknown,
): ApiHandlerResponse {
  return {
    statusCode,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  };
}

/**
 * Build JSON response with CORS and secure defaults for API Gateway handlers.
 *
 * @example
 * return secureJsonResponse(200, { ok: true }, "https://app.example.com");
 */
export function secureJsonResponse(
  statusCode: number,
  body: unknown,
  origin = "*",
): ApiHandlerResponse {
  return {
    statusCode,
    headers: {
      "content-type": "application/json",
      "access-control-allow-origin": origin,
      "access-control-allow-headers":
        "content-type,authorization,x-correlation-id",
      "access-control-allow-methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
      "x-content-type-options": "nosniff",
    },
    body: JSON.stringify(body),
  };
}

/**
 * Build consistent error response without leaking internal error objects.
 *
 * @example
 * return handlerErrorResponse(500, "Internal error");
 */
export function handlerErrorResponse(
  statusCode: number,
  message: string,
): ApiHandlerResponse {
  return handlerResponse(statusCode, { error: message });
}
