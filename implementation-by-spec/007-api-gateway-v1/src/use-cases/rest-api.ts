import {
  APIGatewayClient,
  CreateDeploymentCommand,
  CreateModelCommand,
  CreateResourceCommand,
  CreateRestApiCommand,
  DeleteRestApiCommand,
  GetResourcesCommand,
  PutIntegrationCommand,
  PutMethodCommand,
} from "@aws-sdk/client-api-gateway";
import { client as defaultClient } from "../client.js";
import { APIGatewayv1RESTError } from "../errors.js";

const err = (op: string, e: unknown): never => {
  throw new APIGatewayv1RESTError(
    e instanceof Error && e.name ? e.name : "UNKNOWN",
    `API Gateway v1 ${op} failed`,
    e
  );
};

function requireValue(value: string | undefined, label: string): string {
  if (!value) throw new Error(`${label} missing`);
  return value;
}

export async function createRestApi(name: string, api: APIGatewayClient = defaultClient): Promise<string> {
  try {
    const result = await api.send(new CreateRestApiCommand({ name, endpointConfiguration: { types: ["REGIONAL"] } }));
    return requireValue(result.id, "RestApi id");
  } catch (e) {
    return err("createRestApi", e);
  }
}

export async function rootResourceId(restApiId: string, api: APIGatewayClient = defaultClient): Promise<string | undefined> {
  try {
    return (await api.send(new GetResourcesCommand({ restApiId }))).items?.find((r) => r.path === "/")?.id;
  } catch (e) {
    return err("rootResourceId", e);
  }
}

export async function createResource(
  restApiId: string,
  parentId: string,
  pathPart: string,
  api: APIGatewayClient = defaultClient
): Promise<string> {
  try {
    const result = await api.send(new CreateResourceCommand({ restApiId, parentId, pathPart }));
    return requireValue(result.id, "Resource id");
  } catch (e) {
    return err("createResource", e);
  }
}

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
  } catch (e) {
    return err("putMockMethod", e);
  }
}

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
  } catch (e) {
    return err("createJsonModel", e);
  }
}

export async function deployStage(restApiId: string, stageName = "dev", api: APIGatewayClient = defaultClient): Promise<string> {
  try {
    const result = await api.send(new CreateDeploymentCommand({ restApiId, stageName }));
    return requireValue(result.id, "Deployment id");
  } catch (e) {
    return err("deployStage", e);
  }
}

export async function createMockRestApi(name: string, api: APIGatewayClient = defaultClient) {
  const restApiId = await createRestApi(name, api);
  const root = await rootResourceId(restApiId, api);
  if (!root) throw new Error("root resource missing");
  const resourceId = await createResource(restApiId, root, "health", api);
  await putMockMethod(restApiId, resourceId, "GET", api);
  await createJsonModel(restApiId, "Health", api);
  await deployStage(restApiId, "dev", api);
  return { restApiId, resourceId };
}

export async function deleteRestApi(restApiId: string | undefined, api: APIGatewayClient = defaultClient): Promise<void> {
  if (!restApiId) return;
  try {
    await api.send(new DeleteRestApiCommand({ restApiId }));
  } catch (e) {
    if (e instanceof Error && e.name === "NotFoundException") return;
    return err("deleteRestApi", e);
  }
}
