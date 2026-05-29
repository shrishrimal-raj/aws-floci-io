# 007 - API Gateway v1 (REST)

REST API Gateway v1 lab for Floci/local AWS: resources, methods, MOCK integrations, JSON models, deployments, invoke URLs, cleanup, retries, and enterprise example patterns.

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

Run examples with `pnpm example:basic`, `pnpm example:orders`, `pnpm example:events`, `pnpm example:dr`, or `pnpm example:observability`.

## What this module teaches

- Build explicit REST resource trees (`/health`, `/orders`, `/events`, `/audit`).
- Attach MOCK methods for contract-first development and local integration tests.
- Create JSON models for API documentation and validation patterns.
- Deploy stages and build Floci invoke URLs.
- Use retries, `finally` cleanup, and lifecycle helpers to avoid leaked APIs.
- Map local examples to production concerns: auth, audit logging, monitoring, cost, DR, and compliance.

## Module files

- `src/client.ts` - API Gateway v1 SDK client for Floci (`http://localhost:4566`).
- `src/use-cases/rest-api.ts` - reusable REST API operations, retries, lifecycle helper, cleanup.
- `src/examples/*` - practical beginner-to-enterprise examples.
- `scripts/setup.ts` - creates lab REST API and writes `.floci-rest-api.json`.
- `scripts/seed.ts` - prints saved fixture route details.
- `scripts/cleanup.ts` - deletes saved lab REST API and removes `.floci-rest-api.json`.

## Important functions

| Function | Purpose | Practical use |
|---|---|---|
| `createRestApi` | Create regional REST API. | New bounded-context API such as orders or partner ingress. |
| `rootResourceId` | Find `/` parent resource. | Required before creating child resources. |
| `createResource` | Add one path part. | Create `/health`, `/orders`, `/events`, `/audit`. |
| `putMockMethod` | Add method + MOCK integration. | Contract tests before Lambda/HTTP backend exists. |
| `createJsonModel` | Create JSON schema model. | Document payloads and prepare request validation. |
| `deployStage` | Create deployment/stage. | Publish changed resources/methods to `dev` or `prod`. |
| `createMockRoute` | Resource + method helper. | Quickly add one contract endpoint. |
| `createMockRoutes` | Create many contract endpoints. | Enterprise API suites with health, business, audit, event routes. |
| `buildInvokeUrl` | Build Floci REST invoke URL. | Local smoke tests and docs. |
| `retryControlPlane` | Retry transient create/deploy work. | Automation resilient to throttling/startup races. |
| `withRestApiLifecycle` | Create API, run workflow, delete API. | Safe examples, tests, and sandboxes. |
| `createMockRestApi` | Full `/health` API. | Minimal CI smoke-test stack. |
| `deleteRestApi` | Idempotent cleanup. | Cleanup in `finally` blocks and scripts. |

## Examples

| Example | Scenario | Shows |
|---|---|---|
| `basic-rest-api.ts` | Minimal health-check API. | `createMockRestApi`, invoke URL, cleanup. |
| `mock-route.ts` | Single mock route. | Resource creation, method integration, deployment. |
| `invoke-url.ts` | URL generation. | Local REST invoke URL format. |
| `enterprise-order-api.ts` | Order API contract for enterprise app. | Multiple routes, model, retries, secure-access notes, audit, monitoring, cost controls. |
| `event-driven-contract-api.ts` | Partner webhook/event ingress. | Event endpoints, retry/error strategy, DLQ/replay pattern, data lifecycle. |
| `compliance-dr-runbook.ts` | Compliance + disaster recovery drill. | Primary/standby APIs, evidence checklist, backup/restore pattern. |
| `observability-cost-checklist.ts` | Production readiness checklist. | Metrics, logs, alarms, cost optimization. |

## Production mapping

Floci support is intentionally local and partial. For real AWS production, add:

- **Secure access:** Cognito/Lambda/IAM authorizers, private APIs/resource policies, WAF, TLS custom domains, least-privilege IAM.
- **Audit logging:** API Gateway access logs, CloudTrail, structured audit events, retention policies, sensitive-data redaction.
- **Error handling and retries:** client backoff for `429/5XX`, idempotency keys, DLQs/replay for async downstream work.
- **Data lifecycle:** classify logs/payloads, encrypt stores, set retention/expiry, archive events needed for replay or evidence.
- **Event-driven processing:** API Gateway -> Lambda -> EventBridge/SQS/SNS, with DLQ and replay endpoint.
- **Monitoring:** alarms for `4XXError`, `5XXError`, `Latency`, `IntegrationLatency`, `Count`; dashboards per stage.
- **Cost optimization:** usage plans/throttles, delete ephemeral APIs, compare REST API v1 vs HTTP API v2, monitor request volume.
- **Backup/DR:** version OpenAPI/IaC, export config, rehearse failover, document RTO/RPO.
- **Compliance:** change records, deployment IDs, approvers, access evidence, log retention, encryption evidence.

## Runbook

1. Start Floci: `docker compose up -d`.
2. Check health from repo root: `pnpm run floci:health`.
3. Provision fixture API: `pnpm setup`.
4. Deploy/print fixture route: `pnpm seed`.
5. Run tests: `pnpm test`.
6. Try examples: `pnpm example:orders`.
7. Cleanup fixture API and local state file: `pnpm cleanup`.

## Gotchas

- REST API changes need a deployment before stage traffic sees them.
- Resource trees are explicit; create parents before children.
- MOCK integrations are great for contracts, not final production backends.
- This lab uses unauthenticated MOCK methods so it stays runnable in Floci. Add auth/throttling/logging in real AWS.
- REST API v1 has different features and pricing than HTTP API v2.
