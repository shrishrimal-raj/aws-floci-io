#!/usr/bin/env tsx
import {
  buildInvokeUrl,
  createJsonModel,
  createMockRoutes,
  createRestApi,
  deployStage,
  deleteRestApi,
  retryControlPlane,
  rootResourceId,
} from "../use-cases/rest-api.js";

const stageName = "dev";
const apiName = `floci-orders-enterprise-${Date.now()}`;
let restApiId: string | undefined;

try {
  restApiId = await retryControlPlane(() => createRestApi(apiName), { attempts: 3, delayMs: 200 });
  const rootId = await rootResourceId(restApiId);
  if (!rootId) throw new Error("root resource missing");

  const routes = await createMockRoutes([
    {
      restApiId,
      parentId: rootId,
      pathPart: "health",
      method: "GET",
      description: "load balancer, uptime, and synthetic monitoring probes",
    },
    {
      restApiId,
      parentId: rootId,
      pathPart: "orders",
      method: "POST",
      description: "order intake contract before Lambda/HTTP integration is attached",
    },
    {
      restApiId,
      parentId: rootId,
      pathPart: "audit",
      method: "POST",
      description: "central audit-event intake for traceability and compliance evidence",
    },
  ]);

  const modelId = await createJsonModel(restApiId, "OrderCommand");
  const deploymentId = await retryControlPlane(() => deployStage(restApiId!, stageName), { attempts: 3, delayMs: 200 });

  console.log({
    scenario: "enterprise order API contract",
    restApiId,
    modelId,
    deploymentId,
    routes: routes.map((route) => ({
      ...route,
      invokeUrl: buildInvokeUrl(restApiId!, stageName, route.pathPart),
    })),
    secureAccessPattern: {
      localDemo: "MOCK uses authorizationType NONE because Floci lab focuses on REST resources/methods/deployments.",
      production: [
        "Attach Cognito/Lambda/IAM authorizer or private API policy.",
        "Require TLS, least-privilege IAM, WAF managed rules, and usage-plan throttling.",
        "Validate requests with JSON models before invoking downstream compute.",
      ],
    },
    observabilityPattern: {
      logs: "Enable API Gateway access logs and execution logs in real AWS.",
      metrics: ["4XXError", "5XXError", "Latency", "IntegrationLatency", "Count"],
      audit: "Send /audit events to durable storage such as CloudWatch Logs, Firehose, or S3 in production.",
    },
    costOptimization: [
      "Use REST API v1 only when you need its advanced features; prefer HTTP API v2 for simple low-cost APIs.",
      "Set throttles and quotas per consumer to prevent runaway traffic.",
      "Keep stages and deployments lifecycle-managed; delete short-lived test APIs.",
    ],
  });
} catch (error) {
  console.error("enterprise order API example failed", error);
  throw error;
} finally {
  await deleteRestApi(restApiId);
}
