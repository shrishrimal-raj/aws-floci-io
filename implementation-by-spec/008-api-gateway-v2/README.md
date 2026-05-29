# 008 - API Gateway v2 (HTTP)

> Enterprise HTTP APIs with routes, proxy integrations, auto-deploy stages, invoke URLs, CORS/security responses, audit events, route helpers, and cost modeling.

## Quick start

```bash
docker compose up -d
pnpm install
cd implementation-by-spec/008-api-gateway-v2
pnpm setup
pnpm seed
pnpm test
pnpm cleanup
```

## Module

- `src/client.ts` - API Gateway v2 SDK client for Floci (`http://localhost:4566`).
- `src/use-cases/http-api.ts` - HTTP API creation, integrations, routes, stages, invoke URLs, responses, audit, cost.
- `src/examples/basic-http-api.ts` - creates `GET /health` HTTP API and deletes it.
- `src/examples/invoke-url.ts` - local invoke URL builder.
- `src/examples/proxy-response.ts` - basic Lambda proxy responses.
- `src/examples/enterprise-orders-api.ts` - multi-route enterprise orders API with audit/cost.
- `src/examples/secure-proxy-response.ts` - secure response, route key, denied audit event.
- `src/examples/event-webhook-api.ts` - SaaS webhook API for event-driven processing.
- `src/examples/observability-cost.ts` - CORS, secure health response, metrics, cost.
- `src/examples/compliance-admin-api.ts` - admin compliance export route pattern.
- `scripts/setup.ts` - creates lab HTTP API.
- `scripts/seed.ts` - deploys/prints fixture route details.
- `scripts/cleanup.ts` - deletes lab HTTP API.

## Operations covered

| Operation     | Function                                                                 | Notes                                                 |
| ------------- | ------------------------------------------------------------------------ | ----------------------------------------------------- |
| Route helpers | `routeKey`                                                               | Normalizes `METHOD /path` route keys.                 |
| Create API    | `createHttpApi`                                                          | `ProtocolType: HTTP`; simpler/cheaper than REST API.  |
| Integrations  | `createMockIntegration`, `createHttpProxyIntegration`                    | Demo integration and configurable HTTP proxy backend. |
| Routes        | `createRoute`, `createRoutes`                                            | One or many routes mapped to an integration.          |
| Stage         | `createStage`                                                            | Auto-deploy `$default` or named stage.                |
| Invoke URL    | `buildHttpInvokeUrl`                                                     | Floci local `/_aws/execute-api/{apiId}` URL.          |
| Basic API     | `createBasicHttpApi`                                                     | End-to-end health API helper.                         |
| Cleanup       | `deleteHttpApi`                                                          | Idempotent cleanup.                                   |
| Responses     | `httpResponse`, `httpErrorResponse`, `secureHttpResponse`, `corsHeaders` | JSON, error, CORS, and security headers.              |
| Audit/cost    | `createApiAuditEvent`, `estimateHttpApiCost`                             | Structured audit payload and request-cost estimate.   |

## Function examples

### Multi-route orders API

```ts
const apiId = await createHttpApi("orders-api");
const integrationId = await createHttpProxyIntegration({
  apiId,
  uri: "https://orders.internal.example.com",
});
await createRoutes(
  apiId,
  [
    { method: "POST", path: "/orders" },
    { method: "GET", path: "/orders/{orderId}" },
  ],
  integrationId,
);
await createStage(apiId, "$default");
```

### Secure Lambda proxy response

```ts
return secureHttpResponse(202, { accepted: true }, "https://app.example.com");
```

### Audit and cost

```ts
const audit = createApiAuditEvent({
  apiId,
  routeKey: "POST /orders",
  action: "CreateOrder",
  outcome: "ALLOW",
});
const cost = estimateHttpApiCost({ requests: 25_000_000 });
```

## Real-world scenarios

- **Secure API front door** - HTTP API routes to Lambda/ECS/HTTP backend; add JWT/Lambda authorizer, WAF, throttling, and access logs in real AWS.
- **Multi-user SaaS APIs** - validate tenant claims in Lambda/backend and include tenant/request/trace IDs in audit events.
- **Webhook ingestion** - receive Stripe/GitHub/SaaS webhooks, validate signatures, enqueue to SQS/EventBridge for async processing.
- **Event-driven processing** - API accepts commands and returns `202`; backend publishes SNS/EventBridge events or starts Step Functions.
- **Audit logging** - emit route, actor/tenant, request ID, action, and outcome to CloudWatch/S3/SIEM.
- **Data lifecycle** - admin routes can trigger exports, retention jobs, and cleanup workflows; durable state lives in S3/DynamoDB/RDS.
- **AWS integrations** - Lambda proxy, HTTP proxy, VPC Link/private ALB, Cognito/JWT authorizer, CloudWatch Logs, ACM/Route53 custom domain.
- **Monitoring** - alarm on 4XX, 5XX, latency, integration latency, authorizer errors, throttles, and backend failures.
- **Cost optimization** - HTTP APIs cost less than REST APIs; use CloudFront/cache for read-heavy public paths and avoid unnecessary route metrics.
- **Compliance** - least-privilege invoke permissions, access logs, TLS/custom domains, WAF, no PII in paths/query strings.

## Runbook

1. Start Floci: `docker compose up -d`.
2. Check health: `pnpm run floci:health` from repo root.
3. Provision HTTP API: `pnpm setup`.
4. Deploy/print fixture route: `pnpm seed`.
5. Run tests: `pnpm test`.
6. Run examples: `pnpm exec tsx src/examples/<file>.ts`.
7. Cleanup HTTP API: `pnpm cleanup`.

## Testing guidance

- Cover route key creation, API/integration/route/stage creation, invoke URLs, responses, CORS, audit/cost, cleanup, and error wrapping.
- Contract-test Lambda proxy event/response shape.
- Production apps should test auth failures, tenant isolation, throttling, webhook signature validation, and backend timeouts.

## Production checklist

- [ ] JWT/Lambda authorizer configured where needed.
- [ ] CORS restricted to trusted origins.
- [ ] Access logs include request ID, route, status, latency, integration error.
- [ ] Alarms on 4XX/5XX/latency/throttles.
- [ ] Custom domain uses ACM TLS cert and Route53 record.
- [ ] WAF/rate limits protect public APIs.
- [ ] Backend/Lambda permissions scoped to API route/source ARN.
- [ ] No secrets or PII in paths/query strings/logs.

## Gotchas

- HTTP APIs are cheaper/faster but have fewer features than REST APIs.
- `$default` auto-deploy makes changes live quickly.
- Route keys combine method and path, e.g. `GET /orders`.
- Payload format differs from REST API v1 proxy events.
- Real Lambda/HTTP integrations need permissions, timeouts, and failure handling.

## Floci vs Real AWS

Floci support: **partial** for this lab. On real AWS, verify Lambda permissions, JWT/Lambda authorizers, CORS, access logs, custom domains, WAF, route metrics, throttling, payload format versions, integration timeouts, regional endpoints, authorizer caching, and per-million request pricing.
