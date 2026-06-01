# 006 - Lambda

> Enterprise serverless functions with create/update/invoke/delete operations, JSON invocation, async events, API responses, tenant-aware request parsing, audit events, retries, and cost modeling.

## Quick start

```bash
docker compose up -d
pnpm install
cd implementation-by-spec/006-lambda
pnpm setup
pnpm seed
pnpm test
pnpm cleanup
```

## Module

- `src/client.ts` - Lambda SDK v3 client for Floci (`http://localhost:4566`).
- `src/use-cases/functions.ts` - function lifecycle, sync/async invocation, retries, API helpers, audit, request context, alarms, redaction, and cost.
- `src/examples/invoke-function.ts` - create, invoke, delete.
- `src/examples/async-invoke.ts` - `InvocationType: Event` flow.
- `src/examples/api-response.ts` - basic API Gateway-style responses.
- `src/examples/secure-api-handler.ts` - tenant-aware API parsing, secure JSON response, audit log.
- `src/examples/order-worker-retry.ts` - worker spec, update code, retry invoke.
- `src/examples/event-driven-pipeline.ts` - S3/EventBridge-style async pipeline.
- `src/examples/observability-cost.ts` - audit event, metrics to watch, monthly cost estimate.
- `src/examples/compliance-maintenance-job.ts` - scheduled compliance/maintenance job pattern.
- `src/examples/integration-api-sqs-lambda.ts` - API Lambda + async worker integration pattern.
- `src/examples/backup-dr-restore-runbook.ts` - stateless Lambda DR restore and replay runbook.
- `src/examples/compliance-secrets-and-redaction.ts` - sensitive env handling and redacted logging pattern.
- `scripts/setup.ts` - creates API, worker, and compliance lab functions.
- `scripts/seed.ts` - invokes realistic API/worker/compliance fixture payloads.
- `scripts/cleanup.ts` - deletes all created lab functions.

## Operations covered

| Operation       | Function                                                                | Notes                                                          |
| --------------- | ----------------------------------------------------------------------- | -------------------------------------------------------------- |
| Function spec   | `serviceFunctionSpec`                                                   | Standard runtime, handler, env, timeout, memory defaults.      |
| Lifecycle       | `createFunction`, `createFunctionIfMissing`, `getFunction`, `updateFunctionCode`, `deleteFunction` | Create/read/update/delete Lambda functions.                    |
| Invoke          | `invokeJson`, `invokeForResult`, `invokeEvent`, `invokeJsonWithRetry`   | Sync, detailed result, async event, retry wrapper.             |
| Invoke batches  | `invokeBatchJson`, `invokeAndAudit`                                     | Batch-style invocation summary and standardized audit wrapping. |
| API helpers     | `handlerResponse`, `handlerErrorResponse`, `secureJsonResponse`         | JSON responses, safe errors, CORS/security headers.            |
| Request helpers | `parseApiJsonBody`, `requestContext`                                    | Validate JSON body and extract request/tenant/trace context.   |
| Audit/ops/cost  | `createLambdaAuditEvent`, `planLambdaAlarms`, `redactSensitiveEnv`, `estimateLambdaCost` | Audit payloads, alarm hints, safe config logging, and cost estimate. |

## Function examples

### Tenant-safe API handler

```ts
const body = parseApiJsonBody<{ orderId: string }>(event);
const context = requestContext(event);
if (!context.tenantId) return handlerErrorResponse(403, "Missing tenant claim");
return secureJsonResponse(202, { accepted: true, orderId: body.orderId });
```

### Worker with retries

```ts
await createFunction(
  serviceFunctionSpec(
    "orders-worker",
    { ORDERS_TABLE: "orders" },
    { memoryMb: 512 },
  ),
);
const result = await invokeJsonWithRetry("orders-worker", {
  type: "OrderPaid",
  orderId: "o1",
});
```

### Cost and audit

```ts
const audit = createLambdaAuditEvent({
  functionName: "orders-api",
  action: "CreateOrder",
  outcome: "SUCCESS",
});
const cost = estimateLambdaCost({
  requests: 5_000_000,
  durationMs: 120,
  memoryMb: 512,
});
```

## Real-world scenarios

- **Secure API handlers** - API Gateway invokes Lambda; handler validates JSON, tenant claims, auth context, and returns safe errors.
- **Event-driven processing** - S3/SNS/SQS/EventBridge invoke Lambda asynchronously; failed events need DLQ or destinations.
- **Worker retries** - retry platform throttles, but make downstream writes idempotent before retrying business logic.
- **Audit logging** - log actor, tenant, action, request ID, trace ID, outcome; ship logs to CloudWatch/S3/SIEM.
- **Data lifecycle** - scheduled Lambdas clean expired records, run compaction, export archives, or enforce retention.
- **AWS integrations** - common integrations: API Gateway, SQS, SNS, EventBridge, DynamoDB, S3, KMS, Secrets Manager, CloudWatch.
- **Monitoring** - alarm on errors, throttles, duration, concurrency, iterator age, DLQ depth, and destination failures.
- **Cost optimization** - right-size memory, reduce duration/cold starts, batch event source records, avoid chatty SDK calls.
- **Backup/DR** - Lambda is stateless; store durable state in DynamoDB/RDS/S3 and redeploy functions from IaC/artifacts.
- **Compliance** - least-privilege execution role, no secrets in env, KMS/Secrets Manager for sensitive config, audit trails.

## Runbook

1. Start Floci: `docker compose up -d`.
2. Check health: `pnpm run floci:health` from repo root.
3. Provision lab functions: `pnpm setup`.
4. Invoke fixture payloads: `pnpm seed`.
5. Run tests: `pnpm test`.
6. Run examples: `pnpm exec tsx src/examples/<file>.ts`.
7. Cleanup functions: `pnpm cleanup`.

## Testing guidance

- Cover response helpers, body parsing, request context, audit/cost helpers, sync invoke, async invoke, retry wrapper, update, and error wrapping.
- Unit-test handlers without AWS by passing event fixtures.
- Production apps should add contract tests for API Gateway events, SQS/SNS/EventBridge events, IAM denial tests, and load/cold-start tests.

## Production checklist

- [ ] Execution role least privilege and CloudWatch Logs permissions.
- [ ] Secrets stored in Secrets Manager/SSM, not plaintext env vars.
- [ ] Timeout, memory, reserved concurrency, and retry settings tuned.
- [ ] DLQ/destinations configured for async/event source failures.
- [ ] Structured logs include request ID, trace ID, tenant ID, outcome.
- [ ] Alarms for errors, throttles, duration, concurrency, DLQ depth.
- [ ] Deployment uses versions/aliases or safe rollout strategy.
- [ ] IaC can recreate functions and event source mappings.

## Gotchas

- SDK invoke can succeed while function payload contains an application error.
- Async invokes retry; duplicate processing is normal.
- Cold starts, VPC networking, bundle size, and memory affect latency.
- Lambda package must match handler export and runtime.
- Environment variables are config, not secret storage.

## Floci vs Real AWS

Floci support: **partial** for this lab. On real AWS, verify IAM execution roles, CloudWatch Logs, X-Ray/tracing, reserved concurrency, retry/DLQ/destinations, event source mappings, VPC networking, aliases/versions, package limits, runtime lifecycle, concurrency quotas, cold starts, and per-ms pricing.
