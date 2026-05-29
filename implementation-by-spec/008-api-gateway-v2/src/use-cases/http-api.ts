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

function awsErrorName(error: unknown): string {
  if (error instanceof APIGatewayv2HTTPError && error.cause instanceof Error) return error.cause.name;
  return error instanceof Error ? error.name : "";
}

function wrapError(operation: string, error: unknown): never {
  const code = awsErrorName(error) || "UNKNOWN";
  throw new APIGatewayv2HTTPError(code, `API Gateway v2 ${operation} failed`, error);
}

function requireValue(value: string | undefined, label: string): string {
  if (!value) throw new Error(`${label} missing`);
  return value;
}

/**
 * Create lightweight HTTP API.
 *
 * @example
 * const apiId = await createHttpApi("orders-http");
 */
export async function createHttpApi(name: string, api: ApiGatewayV2Client = defaultClient): Promise<string> {
  try {
    const result = await api.send(new CreateApiCommand({ Name: name, ProtocolType: "HTTP" }));
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
export async function createMockIntegration(apiId: string, api: ApiGatewayV2Client = defaultClient): Promise<string> {
  try {
    const result = await api.send(
      new CreateIntegrationCommand({
        ApiId: apiId,
        IntegrationType: "HTTP_PROXY",
        IntegrationMethod: "ANY",
        IntegrationUri: "https://example.com",
      })
    );
    return requireValue(result.IntegrationId, "IntegrationId");
  } catch (error) {
    wrapError("createMockIntegration", error);
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
  api: ApiGatewayV2Client = defaultClient
): Promise<string> {
  try {
    const result = await api.send(
      new CreateRouteCommand({ ApiId: apiId, RouteKey: routeKey, Target: `integrations/${integrationId}` })
    );
    return requireValue(result.RouteId, "RouteId");
  } catch (error) {
    wrapError("createRoute", error);
  }
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
  api: ApiGatewayV2Client = defaultClient
): Promise<string> {
  try {
    const result = await api.send(new CreateStageCommand({ ApiId: apiId, StageName: name, AutoDeploy: true }));
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
  endpoint = process.env.AWS_ENDPOINT_URL ?? "http://localhost:4566"
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
export async function createBasicHttpApi(name: string, api: ApiGatewayV2Client = defaultClient): Promise<HttpApiResult> {
  const apiId = await createHttpApi(name, api);
  const integrationId = await createMockIntegration(apiId, api);
  const routeId = await createRoute(apiId, "GET /health", integrationId, api);
  const stageName = await createStage(apiId, "$default", api);
  return { apiId, integrationId, routeId, stageName, invokeUrl: buildHttpInvokeUrl(apiId, "/health") };
}

/**
 * Delete HTTP API; undefined or missing APIs are treated as cleaned up.
 *
 * @example
 * await deleteHttpApi(apiId);
 */
export async function deleteHttpApi(
  apiId: string | undefined,
  api: ApiGatewayV2Client = defaultClient
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
export function httpResponse(statusCode: number, body: unknown): HttpProxyResponse {
  return { statusCode, headers: { "content-type": "application/json" }, body: JSON.stringify(body) };
}

/**
 * Build HTTP API error response.
 *
 * @example
 * return httpErrorResponse(400, "Bad request");
 */
export function httpErrorResponse(statusCode: number, message: string): HttpProxyResponse {
  return httpResponse(statusCode, { error: message });
}
