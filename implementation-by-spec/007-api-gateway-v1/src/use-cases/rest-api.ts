import {
  CreateDeploymentCommand,
  CreateModelCommand,
  CreateResourceCommand,
  CreateRestApiCommand,
  DeleteRestApiCommand,
  GetResourcesCommand,
  PutIntegrationCommand,
  PutMethodCommand,
  type APIGatewayClient,
} from "@aws-sdk/client-api-gateway";
import { client as defaultClient } from "../client.js";
import { APIGatewayv1RESTError } from "../errors.js";

export interface RestRouteInput {
  restApiId: string;
  parentId: string;
  pathPart: string;
  method?: string;
}

export interface MockRestApiResult {
  restApiId: string;
  resourceId: string;
  stageName: string;
  invokeUrl: string;
}

export interface EnterpriseMockRouteInput extends RestRouteInput {
  description?: string;
}

export interface EnterpriseMockRouteResult {
  pathPart: string;
  method: string;
  resourceId: string;
  description?: string;
}

export interface ControlPlaneRetryOptions {
  attempts?: number;
  delayMs?: number;
  shouldRetry?: (error: unknown, attempt: number) => boolean;
}

function awsErrorName(error: unknown): string {
  if (error instanceof APIGatewayv1RESTError && error.cause instanceof Error) return error.cause.name;
  return error instanceof Error ? error.name : "";
}

function wrapError(operation: string, error: unknown): never {
  const code = awsErrorName(error) || "UNKNOWN";
  throw new APIGatewayv1RESTError(code, `API Gateway v1 ${operation} failed`, error);
}

function requireValue(value: string | undefined, label: string): string {
  if (!value) throw new Error(`${label} missing`);
  return value;
}

function sleep(delayMs: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, delayMs));
}

/**
 * Retry control-plane work such as create/deploy calls.
 * Use for enterprise automation where throttling or temporary local emulator startup races can happen.
 *
 * @example
 * const apiId = await retryControlPlane(() => createRestApi("orders-api"), { attempts: 3, delayMs: 250 });
 */
export async function retryControlPlane<T>(
  operation: () => Promise<T>,
  options: ControlPlaneRetryOptions = {}
): Promise<T> {
  const attempts = options.attempts ?? 3;
  const delayMs = options.delayMs ?? 250;
  const shouldRetry = options.shouldRetry ?? (() => true);
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt >= attempts || !shouldRetry(error, attempt)) throw error;
      await sleep(delayMs * attempt);
    }
  }

  throw lastError;
}

/**
 * Create a regional REST API.
 * Enterprise use: one API per bounded context such as orders, billing, or partner-ingress.
 *
 * @example
 * const restApiId = await createRestApi("orders-api");
 */
export async function createRestApi(name: string, api: APIGatewayClient = defaultClient): Promise<string> {
  try {
    const result = await api.send(new CreateRestApiCommand({ name, endpointConfiguration: { types: ["REGIONAL"] } }));
    return requireValue(result.id, "RestApi id");
  } catch (error) {
    wrapError("createRestApi", error);
  }
}

/**
 * Find the root `/` resource ID for a REST API.
 * Resource creation needs this ID before adding `/health`, `/orders`, or other child paths.
 *
 * @example
 * const rootId = await rootResourceId(restApiId);
 */
export async function rootResourceId(
  restApiId: string,
  api: APIGatewayClient = defaultClient
): Promise<string | undefined> {
  try {
    return (await api.send(new GetResourcesCommand({ restApiId }))).items?.find((resource) => resource.path === "/")?.id;
  } catch (error) {
    wrapError("rootResourceId", error);
  }
}

/**
 * Create one child resource under a parent resource.
 * Use this to model explicit REST paths such as `/health`, `/orders`, `/events`, or `/audit`.
 *
 * @example
 * const resourceId = await createResource(restApiId, rootId, "health");
 */
export async function createResource(
  restApiId: string,
  parentId: string,
  pathPart: string,
  api: APIGatewayClient = defaultClient
): Promise<string> {
  try {
    const result = await api.send(new CreateResourceCommand({ restApiId, parentId, pathPart }));
    return requireValue(result.id, "Resource id");
  } catch (error) {
    wrapError("createResource", error);
  }
}

/**
 * Add an unauthenticated method with MOCK integration.
 * MOCK integrations are useful for contract tests, developer portals, and early API-first delivery.
 * Production APIs should add auth, request validation, throttling, and real Lambda/HTTP/AWS integrations.
 *
 * @example
 * await putMockMethod(restApiId, resourceId, "GET");
 */
export async function putMockMethod(
  restApiId: string,
  resourceId: string,
  method = "GET",
  api: APIGatewayClient = defaultClient
): Promise<void> {
  try {
    await api.send(new PutMethodCommand({ restApiId, resourceId, httpMethod: method, authorizationType: "NONE" }));
    await api.send(
      new PutIntegrationCommand({
        restApiId,
        resourceId,
        httpMethod: method,
        type: "MOCK",
        requestTemplates: { "application/json": '{"statusCode":200}' },
      })
    );
  } catch (error) {
    wrapError("putMockMethod", error);
  }
}

/**
 * Create a JSON schema model for request/response documentation and validation.
 * Models help enterprise teams publish contracts before wiring production integrations.
 *
 * @example
 * const modelId = await createJsonModel(restApiId, "Message");
 */
export async function createJsonModel(
  restApiId: string,
  name = "Message",
  api: APIGatewayClient = defaultClient
): Promise<string> {
  try {
    const result = await api.send(
      new CreateModelCommand({
        restApiId,
        name,
        contentType: "application/json",
        schema: JSON.stringify({ type: "object", required: ["message"], properties: { message: { type: "string" } } }),
      })
    );
    return requireValue(result.id, "Model id");
  } catch (error) {
    wrapError("createJsonModel", error);
  }
}

/**
 * Create deployment and expose a stage.
 * Call after resources, methods, integrations, or models change so stage traffic sees the new API shape.
 *
 * @example
 * const deploymentId = await deployStage(restApiId, "dev");
 */
export async function deployStage(
  restApiId: string,
  stageName = "dev",
  api: APIGatewayClient = defaultClient
): Promise<string> {
  try {
    const result = await api.send(new CreateDeploymentCommand({ restApiId, stageName }));
    return requireValue(result.id, "Deployment id");
  } catch (error) {
    wrapError("deployStage", error);
  }
}

/**
 * Create a child resource plus MOCK method in one call.
 * Use when you need fast contract endpoints for demos, integration tests, or partner onboarding.
 *
 * @example
 * const route = await createMockRoute({ restApiId, parentId: rootId, pathPart: "health", method: "GET" });
 */
export async function createMockRoute(
  input: RestRouteInput,
  api: APIGatewayClient = defaultClient
): Promise<string> {
  const resourceId = await createResource(input.restApiId, input.parentId, input.pathPart, api);
  await putMockMethod(input.restApiId, resourceId, input.method ?? "GET", api);
  return resourceId;
}

/**
 * Create several top-level MOCK routes for one REST API.
 * Use for enterprise contract suites where health, business, audit, and event endpoints are deployed together.
 *
 * @example
 * const routes = await createMockRoutes([
 *   { restApiId, parentId: rootId, pathPart: "health", method: "GET" },
 *   { restApiId, parentId: rootId, pathPart: "orders", method: "POST" },
 * ]);
 */
export async function createMockRoutes(
  routes: EnterpriseMockRouteInput[],
  api: APIGatewayClient = defaultClient
): Promise<EnterpriseMockRouteResult[]> {
  const created: EnterpriseMockRouteResult[] = [];

  for (const route of routes) {
    const resourceId = await createMockRoute(route, api);
    created.push({
      pathPart: route.pathPart,
      method: route.method ?? "GET",
      resourceId,
      description: route.description,
    });
  }

  return created;
}

/**
 * Build local Floci REST API invoke URL.
 * The URL format matches LocalStack/Floci REST API v1 emulation for local contract tests.
 *
 * @example
 * const url = buildInvokeUrl("abc123", "dev", "/health");
 */
export function buildInvokeUrl(
  restApiId: string,
  stageName = "dev",
  path = "/",
  endpoint = process.env.AWS_ENDPOINT_URL ?? "http://localhost:4566"
): string {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${endpoint.replace(/\/$/, "")}/restapis/${restApiId}/${stageName}/_user_request_${cleanPath}`;
}

/**
 * Create a deployable `/health` REST API with model and mock integration.
 * Use as a minimal smoke-test stack for CI and developer onboarding.
 *
 * @example
 * const api = await createMockRestApi("health-api");
 */
export async function createMockRestApi(name: string, api: APIGatewayClient = defaultClient): Promise<MockRestApiResult> {
  const restApiId = await createRestApi(name, api);
  const root = await rootResourceId(restApiId, api);
  if (!root) throw new Error("root resource missing");
  const resourceId = await createMockRoute({ restApiId, parentId: root, pathPart: "health", method: "GET" }, api);
  await createJsonModel(restApiId, "Health", api);
  await deployStage(restApiId, "dev", api);
  return { restApiId, resourceId, stageName: "dev", invokeUrl: buildInvokeUrl(restApiId, "dev", "/health") };
}

/**
 * Create an API, pass it to a workflow, then always delete it.
 * Use for tests, examples, sandboxes, and lifecycle-safe automation.
 *
 * @example
 * await withRestApiLifecycle("orders-contract", async ({ restApiId }) => console.log(restApiId));
 */
export async function withRestApiLifecycle<T>(
  name: string,
  workflow: (api: { restApiId: string }) => Promise<T>,
  api: APIGatewayClient = defaultClient
): Promise<T> {
  let restApiId: string | undefined;
  try {
    restApiId = await createRestApi(name, api);
    return await workflow({ restApiId });
  } finally {
    await deleteRestApi(restApiId, api);
  }
}

/**
 * Delete REST API; undefined or missing APIs are treated as cleaned up.
 * Call from `finally` blocks so examples and CI jobs do not leak local or cloud resources.
 *
 * @example
 * await deleteRestApi(restApiId);
 */
export async function deleteRestApi(restApiId: string | undefined, api: APIGatewayClient = defaultClient): Promise<void> {
  if (!restApiId) return;
  try {
    await api.send(new DeleteRestApiCommand({ restApiId }));
  } catch (error) {
    if (awsErrorName(error) === "NotFoundException") return;
    wrapError("deleteRestApi", error);
  }
}
