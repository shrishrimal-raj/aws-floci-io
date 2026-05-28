import {
  ApiGatewayV2Client,
  CreateApiCommand,
  CreateIntegrationCommand,
  CreateRouteCommand,
  CreateStageCommand,
  DeleteApiCommand,
} from "@aws-sdk/client-apigatewayv2";
import { client as defaultClient } from "../client.js";
import { APIGatewayv2HTTPError } from "../errors.js";

const err = (op: string, e: unknown): never => {
  throw new APIGatewayv2HTTPError(
    e instanceof Error && e.name ? e.name : "UNKNOWN",
    `API Gateway v2 ${op} failed`,
    e
  );
};

function requireValue(value: string | undefined, label: string): string {
  if (!value) throw new Error(`${label} missing`);
  return value;
}

export async function createHttpApi(name: string, api: ApiGatewayV2Client = defaultClient): Promise<string> {
  try {
    const result = await api.send(new CreateApiCommand({ Name: name, ProtocolType: "HTTP" }));
    return requireValue(result.ApiId, "ApiId");
  } catch (e) {
    return err("createHttpApi", e);
  }
}

export async function createMockIntegration(
  apiId: string,
  api: ApiGatewayV2Client = defaultClient
): Promise<string> {
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
  } catch (e) {
    return err("createMockIntegration", e);
  }
}

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
  } catch (e) {
    return err("createRoute", e);
  }
}

export async function createStage(
  apiId: string,
  name = "$default",
  api: ApiGatewayV2Client = defaultClient
): Promise<string> {
  try {
    const result = await api.send(new CreateStageCommand({ ApiId: apiId, StageName: name, AutoDeploy: true }));
    return requireValue(result.StageName, "StageName");
  } catch (e) {
    return err("createStage", e);
  }
}

export async function createBasicHttpApi(name: string, api: ApiGatewayV2Client = defaultClient) {
  const apiId = await createHttpApi(name, api);
  const integrationId = await createMockIntegration(apiId, api);
  const routeId = await createRoute(apiId, "GET /health", integrationId, api);
  await createStage(apiId, "$default", api);
  return { apiId, integrationId, routeId };
}

export async function deleteHttpApi(
  apiId: string | undefined,
  api: ApiGatewayV2Client = defaultClient
): Promise<void> {
  if (!apiId) return;
  try {
    await api.send(new DeleteApiCommand({ ApiId: apiId }));
  } catch (e) {
    if (e instanceof Error && e.name === "NotFoundException") return;
    return err("deleteHttpApi", e);
  }
}

export function httpResponse(statusCode: number, body: unknown) {
  return { statusCode, headers: { "content-type": "application/json" }, body: JSON.stringify(body) };
}
