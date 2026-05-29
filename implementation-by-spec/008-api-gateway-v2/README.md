# 008 - API Gateway v2 (HTTP)

> Lightweight HTTP APIs with routes, HTTP proxy integrations, auto-deploy `$default` stages, invoke URLs, and Lambda proxy response helpers.

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
- `src/use-cases/http-api.ts` - HTTP API creation, integrations, routes, auto-deploy stages, invoke URLs, proxy responses, cleanup.
- `src/examples/basic-http-api.ts` - creates `GET /health` HTTP API and deletes it.
- `src/examples/invoke-url.ts` - local HTTP API invoke URL builder.
- `src/examples/proxy-response.ts` - success/error Lambda proxy responses.
- `scripts/setup.ts` - creates lab HTTP API.
- `scripts/seed.ts` - deploys/prints fixture route details.
- `scripts/cleanup.ts` - deletes lab HTTP API.

## Operations covered

| Operation | Function | Notes |
|---|---|---|
| Create HTTP API | `createHttpApi` | `ProtocolType: HTTP`; cheaper/simpler than REST API. |
| Create integration | `createMockIntegration` | HTTP proxy integration target. |
| Create route | `createRoute` | Route key like `GET /health` mapped to integration. |
| Create stage | `createStage` | Auto-deploy stage, usually `$default`. |
| Build invoke URL | `buildHttpInvokeUrl` | Floci local `/_aws/execute-api/{apiId}` URL. |
| Create basic API | `createBasicHttpApi` | End-to-end API + route + integration + stage helper. |
| Delete API | `deleteHttpApi` | Idempotent cleanup for missing APIs. |
| Success response | `httpResponse` | HTTP API Lambda proxy JSON response. |
| Error response | `httpErrorResponse` | Consistent JSON error body. |

## Use cases

```ts
import { createBasicHttpApi, buildHttpInvokeUrl, httpResponse, deleteHttpApi } from "./src/index.js";

const api = await createBasicHttpApi("health-http");
console.log(api.invokeUrl);
console.log(buildHttpInvokeUrl(api.apiId, "/health"));
console.log(httpResponse(200, { ok: true }));
await deleteHttpApi(api.apiId);
```

## Runbook

1. Start Floci: `docker compose up -d`.
2. Check health: `pnpm run floci:health` from repo root.
3. Provision HTTP API: `pnpm setup`.
4. Deploy/print fixture route: `pnpm seed`.
5. Run tests: `pnpm test`.
6. Cleanup HTTP API: `pnpm cleanup`.

## Gotchas

- HTTP APIs are faster/cheaper but have fewer features than REST APIs.
- `$default` stage with auto-deploy removes manual deployment step, but changes go live quickly.
- Route keys combine method and path: `GET /orders`.
- HTTP API payload format differs from REST API proxy events.
- Add JWT/Lambda authorizers, CORS, throttling, access logs, and custom domains for production.
- Use REST API v1 if you need usage plans/API keys, request validation models, or advanced gateway features.

## Floci vs Real AWS

Floci support: **partial** for this lab. On real AWS, configure integrations with Lambda permissions or HTTP backends, JWT/Lambda authorizers, CORS, access logs, custom domains, route-level metrics, throttling, and alarms for 4XX/5XX/latency. Real AWS also has regional endpoint behavior, payload format versions, integration timeout limits, per-million request pricing, and authorizer caching that local Floci does not fully model.
