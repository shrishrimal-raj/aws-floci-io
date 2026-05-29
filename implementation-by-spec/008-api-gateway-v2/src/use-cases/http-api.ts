import {
  CreateApiCommand,
  CreateIntegrationCommand,
  CreateRouteCommand,
  CreateStageCommand,
  DeleteApiCommand,
  type ApiGatewayV2Client,
} from "@aws-sdk/client-apigatewayv2";
import { client as defaultClient } from "../client.js";
import { APIGatewayv2HTTPError } from "../errors.js";

export interface HttpApiResult {
  apiId: string;
  integrationId: string;
  routeId: string;
  stageName: string;
  invokeUrl: string;
}

export interface HttpProxyResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

export interface HttpIntegrationInput {
  apiId: string;
  uri: string;
  method?: string;
}

export interface RouteDefinition {
  method: string;
  path: string;
}

export interface ApiAuditEvent {
  eventId: string;
  timestamp: string;
  apiId: string;
  routeKey: string;
  action: string;
  outcome: "ALLOW" | "DENY" | "ERROR";
  requestId?: string;
  tenantId?: string;
  traceId?: string;
  reason?: string;
}

export interface HttpApiCostEstimateInput {
  requests: number;
  usdPerMillionRequests?: number;
  freeRequests?: number;
}

export interface HttpApiCostEstimate {
  billableRequests: number;
  requestUsd: number;
}

function awsErrorName(error: unknown): string {
  if (error instanceof APIGatewayv2HTTPError && error.cause instanceof Error)
    return error.cause.name;
  return error instanceof Error ? error.name : "";
}

function wrapError(operation: string, error: unknown): never {
  const code = awsErrorName(error) || "UNKNOWN";
  throw new APIGatewayv2HTTPError(
    code,
    `API Gateway v2 ${operation} failed`,
    error,
  );
}

function requireValue(value: string | undefined, label: string): string {
  if (!value) throw new Error(`${label} missing`);
  return value;
}

/**
 * Build normalized HTTP API route key.
 *
 * @example
 * const route = routeKey("GET", "orders");
 */
export function routeKey(method: string, path: string): string {
  const cleanMethod = method.trim().toUpperCase();
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  if (!cleanMethod || !cleanPath)
    throw new APIGatewayv2HTTPError(
      "VALIDATION",
      "method and path are required",
    );
  return `${cleanMethod} ${cleanPath}`;
}

/**
 * Build CORS headers for HTTP API Lambda proxy responses.
 *
 * @example
 * const headers = corsHeaders("https://app.example.com");
 */
export function corsHeaders(origin = "*"): Record<string, string> {
  return {
    "access-control-allow-origin": origin,
    "access-control-allow-headers":
      "content-type,authorization,x-correlation-id",
    "access-control-allow-methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    "access-control-max-age": "300",
  };
}

/**
 * Build structured audit event for API access logs or compliance sinks.
 *
 * @example
 * createApiAuditEvent({ apiId, routeKey: "POST /orders", action: "CreateOrder", outcome: "ALLOW" });
 */
export function createApiAuditEvent(
  input: Omit<ApiAuditEvent, "eventId" | "timestamp">,
): ApiAuditEvent {
  return {
    eventId: `http-api-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    timestamp: new Date().toISOString(),
    ...input,
  };
}

/**
 * Estimate HTTP API request cost. Defaults are illustrative; verify live AWS Pricing before production use.
 *
 * @example
 * estimateHttpApiCost({ requests: 25_000_000 });
 */
export function estimateHttpApiCost(
  input: HttpApiCostEstimateInput,
): HttpApiCostEstimate {
  const billableRequests = Math.max(
    0,
    input.requests - (input.freeRequests ?? 1_000_000),
  );
  const requestUsd =
    (billableRequests / 1_000_000) * (input.usdPerMillionRequests ?? 1.0);
  return { billableRequests, requestUsd };
}

/**
 * Create lightweight HTTP API.
 *
 * @example
 * const apiId = await createHttpApi("orders-http");
 */
export async function createHttpApi(
  name: string,
  api: ApiGatewayV2Client = defaultClient,
): Promise<string> {
  try {
    const result = await api.send(
      new CreateApiCommand({ Name: name, ProtocolType: "HTTP" }),
    );
    return requireValue(result.ApiId, "ApiId");
  } catch (error) {
    wrapError("createHttpApi", error);
  }
}

/**
 * Create HTTP_PROXY integration for a route target.
 *
 * @example
 * const integrationId = await createMockIntegration(apiId);
 */
export async function createMockIntegration(
  apiId: string,
  api: ApiGatewayV2Client = defaultClient,
): Promise<string> {
  return createHttpProxyIntegration(
    { apiId, uri: "https://example.com", method: "ANY" },
    api,
  );
}

/**
 * Create configurable HTTP_PROXY integration for public/private HTTP backends.
 *
 * @example
 * const integrationId = await createHttpProxyIntegration({ apiId, uri: "https://orders.example.com", method: "POST" });
 */
export async function createHttpProxyIntegration(
  input: HttpIntegrationInput,
  api: ApiGatewayV2Client = defaultClient,
): Promise<string> {
  try {
    const result = await api.send(
      new CreateIntegrationCommand({
        ApiId: input.apiId,
        IntegrationType: "HTTP_PROXY",
        IntegrationMethod: input.method ?? "ANY",
        IntegrationUri: input.uri,
      }),
    );
    return requireValue(result.IntegrationId, "IntegrationId");
  } catch (error) {
    wrapError("createHttpProxyIntegration", error);
  }
}

/**
 * Create route and connect it to integration.
 *
 * @example
 * const routeId = await createRoute(apiId, "GET /health", integrationId);
 */
export async function createRoute(
  apiId: string,
  routeKey: string,
  integrationId: string,
  api: ApiGatewayV2Client = defaultClient,
): Promise<string> {
  try {
    const result = await api.send(
      new CreateRouteCommand({
        ApiId: apiId,
        RouteKey: routeKey,
        Target: `integrations/${integrationId}`,
      }),
    );
    return requireValue(result.RouteId, "RouteId");
  } catch (error) {
    wrapError("createRoute", error);
  }
}

/**
 * Create multiple routes for the same integration.
 *
 * @example
 * await createRoutes(apiId, [{ method: "GET", path: "/orders" }], integrationId);
 */
export async function createRoutes(
  apiId: string,
  routes: RouteDefinition[],
  integrationId: string,
  api: ApiGatewayV2Client = defaultClient,
): Promise<string[]> {
  const routeIds: string[] = [];
  for (const route of routes) {
    routeIds.push(
      await createRoute(
        apiId,
        routeKey(route.method, route.path),
        integrationId,
        api,
      ),
    );
  }
  return routeIds;
}

/**
 * Create auto-deploy stage, usually `$default` for HTTP APIs.
 *
 * @example
 * const stage = await createStage(apiId, "$default");
 */
export async function createStage(
  apiId: string,
  name = "$default",
  api: ApiGatewayV2Client = defaultClient,
): Promise<string> {
  try {
    const result = await api.send(
      new CreateStageCommand({
        ApiId: apiId,
        StageName: name,
        AutoDeploy: true,
      }),
    );
    return requireValue(result.StageName, "StageName");
  } catch (error) {
    wrapError("createStage", error);
  }
}

/**
 * Build local HTTP API invoke URL.
 *
 * @example
 * const url = buildHttpInvokeUrl("abc123", "/health");
 */
export function buildHttpInvokeUrl(
  apiId: string,
  path = "/",
  endpoint = process.env.AWS_ENDPOINT_URL ?? "http://localhost:4566",
): string {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${endpoint.replace(/\/$/, "")}/_aws/execute-api/${apiId}${cleanPath}`;
}

/**
 * Create HTTP API, proxy integration, `GET /health` route, and `$default` stage.
 *
 * @example
 * const api = await createBasicHttpApi("health-http");
 */
export async function createBasicHttpApi(
  name: string,
  api: ApiGatewayV2Client = defaultClient,
): Promise<HttpApiResult> {
  const apiId = await createHttpApi(name, api);
  const integrationId = await createMockIntegration(apiId, api);
  const routeId = await createRoute(apiId, "GET /health", integrationId, api);
  const stageName = await createStage(apiId, "$default", api);
  return {
    apiId,
    integrationId,
    routeId,
    stageName,
    invokeUrl: buildHttpInvokeUrl(apiId, "/health"),
  };
}

/**
 * Delete HTTP API; undefined or missing APIs are treated as cleaned up.
 *
 * @example
 * await deleteHttpApi(apiId);
 */
export async function deleteHttpApi(
  apiId: string | undefined,
  api: ApiGatewayV2Client = defaultClient,
): Promise<void> {
  if (!apiId) return;
  try {
    await api.send(new DeleteApiCommand({ ApiId: apiId }));
  } catch (error) {
    if (awsErrorName(error) === "NotFoundException") return;
    wrapError("deleteHttpApi", error);
  }
}

/**
 * Build HTTP API Lambda proxy JSON response.
 *
 * @example
 * return httpResponse(200, { ok: true });
 */
export function httpResponse(
  statusCode: number,
  body: unknown,
): HttpProxyResponse {
  return {
    statusCode,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  };
}

/**
 * Build HTTP API JSON response with CORS and security headers.
 *
 * @example
 * return secureHttpResponse(200, { ok: true }, "https://app.example.com");
 */
export function secureHttpResponse(
  statusCode: number,
  body: unknown,
  origin = "*",
): HttpProxyResponse {
  return {
    statusCode,
    headers: {
      "content-type": "application/json",
      ...corsHeaders(origin),
      "x-content-type-options": "nosniff",
      "cache-control": "no-store",
    },
    body: JSON.stringify(body),
  };
}

/**
 * Build HTTP API error response.
 *
 * @example
 * return httpErrorResponse(400, "Bad request");
 */
export function httpErrorResponse(
  statusCode: number,
  message: string,
): HttpProxyResponse {
  return httpResponse(statusCode, { error: message });
}
