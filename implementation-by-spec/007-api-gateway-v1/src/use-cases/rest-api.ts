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

/**
 * Create a regional REST API.
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
 * Build local or AWS-style REST API invoke URL.
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
 * Delete REST API; undefined or missing APIs are treated as cleaned up.
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
