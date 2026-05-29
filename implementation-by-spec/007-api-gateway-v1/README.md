# 007 - API Gateway v1 (REST)

> Full REST APIs with resources, methods, MOCK integrations, JSON models, deployments, stages, and Floci invoke URLs.

## Quick start

```bash
docker compose up -d
pnpm install
cd implementation-by-spec/007-api-gateway-v1
pnpm setup
pnpm seed
pnpm test
pnpm cleanup
```

## Module

- `src/client.ts` - API Gateway v1 SDK client for Floci (`http://localhost:4566`).
- `src/use-cases/rest-api.ts` - REST API creation, resources, MOCK methods, JSON models, deployments, invoke URLs, cleanup.
- `src/examples/basic-rest-api.ts` - creates `/health` mock REST API, prints metadata, deletes API.
- `src/examples/mock-route.ts` - deployable mock route and invoke URL output.
- `src/examples/invoke-url.ts` - local Floci REST invoke URL builder.
- `scripts/setup.ts` - creates lab REST API.
- `scripts/seed.ts` - deploys/prints fixture route details.
- `scripts/cleanup.ts` - deletes lab REST API.

## Operations covered

| Operation | Function | Notes |
|---|---|---|
| Create REST API | `createRestApi` | Regional REST API. |
| Find root resource | `rootResourceId` | Required before adding child resources. |
| Create resource | `createResource` | Adds one `pathPart` below parent. |
| Put MOCK method | `putMockMethod` | Adds unauthenticated method and MOCK integration. |
| Create model | `createJsonModel` | JSON schema model for docs/validation patterns. |
| Deploy stage | `deployStage` | Creates deployment and stage name. |
| Create mock route | `createMockRoute` | Resource + method helper. |
| Build invoke URL | `buildInvokeUrl` | Floci local `/restapis/{id}/{stage}/_user_request_` URL. |
| Create mock API | `createMockRestApi` | End-to-end `/health` API with model and `dev` stage. |
| Delete API | `deleteRestApi` | Idempotent cleanup for missing APIs. |

## Use cases

```ts
import { createMockRestApi, buildInvokeUrl, deleteRestApi } from "./src/index.js";

const api = await createMockRestApi("health-api");
console.log(api.invokeUrl);
console.log(buildInvokeUrl(api.restApiId, "dev", "/health"));
await deleteRestApi(api.restApiId);
```

## Runbook

1. Start Floci: `docker compose up -d`.
2. Check health: `pnpm run floci:health` from repo root.
3. Provision REST API: `pnpm setup`.
4. Deploy/print fixture route: `pnpm seed`.
5. Run tests: `pnpm test`.
6. Cleanup REST API: `pnpm cleanup`.

## Gotchas

- REST APIs need deployment after method/integration changes before stage traffic sees updates.
- Resource tree is explicit. Create parent resources before children.
- MOCK integration is useful for contract tests, but production usually uses Lambda/HTTP/AWS integrations.
- Enable request validation/models for safer public APIs.
- Add auth, throttling, access logs, WAF, usage plans, and custom domains for production.
- REST API v1 differs from HTTP API v2 in features, pricing, routes, and integration model.

## Floci vs Real AWS

Floci support: **partial** for this lab. On real AWS, configure IAM/Lambda permissions for integrations, CloudWatch access logs/execution logs, authorizers, request validators, throttling/usage plans, WAF, custom domains, canary deployments, and alarms for 4XX/5XX/latency. Real AWS also has deployment/stage cache behavior, regional/edge/private endpoint types, per-million request pricing, and integration timeout limits that local Floci does not fully model.
