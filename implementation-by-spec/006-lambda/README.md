# 006 - Lambda

> Serverless functions with create/update/invoke/delete operations, JSON invocation helpers, async event invocation, and API handler response helpers.

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
- `src/use-cases/functions.ts` - function create/get/update/invoke/delete, async invocation, API response helpers.
- `src/examples/invoke-function.ts` - create, invoke, and delete a Lambda function.
- `src/examples/async-invoke.ts` - async `InvocationType: Event` flow.
- `src/examples/api-response.ts` - success/error API Gateway-style handler responses.
- `scripts/setup.ts` - creates lab function.
- `scripts/seed.ts` - invokes fixture payload.
- `scripts/cleanup.ts` - deletes lab function.

## Operations covered

| Operation | Function | Notes |
|---|---|---|
| Create function | `createFunction` | Runtime, handler, role, zip bytes, env vars, timeout, memory. |
| Get function | `getFunction` | Reads function configuration/code metadata. |
| Update code | `updateFunctionCode` | Replaces deployed zip bytes. |
| Invoke JSON | `invokeJson` | Synchronous invoke and parsed JSON payload. |
| Invoke result | `invokeForResult` | Returns status code, function error, parsed payload. |
| Async invoke | `invokeEvent` | Fire-and-forget event invocation. |
| Delete function | `deleteFunction` | Idempotent cleanup for missing functions. |
| Success response | `handlerResponse` | API Gateway proxy-style JSON response. |
| Error response | `handlerErrorResponse` | Consistent JSON error body without leaking internals. |

## Use cases

```ts
import { createFunction, invokeJson, handlerResponse, deleteFunction } from "./src/index.js";

await createFunction({
  name: "orders-worker",
  environment: { STAGE: "local" },
  timeoutSeconds: 10,
  memoryMb: 128,
});

const result = await invokeJson("orders-worker", { orderId: "o1" });
console.log(result);
console.log(handlerResponse(200, { ok: true }));
await deleteFunction("orders-worker");
```

## Runbook

1. Start Floci: `docker compose up -d`.
2. Check health: `pnpm run floci:health` from repo root.
3. Provision lab function: `pnpm setup`.
4. Invoke fixture payload: `pnpm seed`.
5. Run tests: `pnpm test`.
6. Cleanup function: `pnpm cleanup`.

## Gotchas

- Real Lambda code must be packaged as a valid zip with handler export matching `Handler`.
- Lambda execution role must allow required AWS API calls and CloudWatch Logs writes.
- Synchronous invokes return function errors in response metadata; SDK call can still succeed.
- Async invokes retry on failure. Configure DLQ or destinations for failed events.
- Cold starts, memory size, timeout, and bundle size affect latency and cost.
- Environment variables are plain config; use Secrets Manager/SSM/KMS for sensitive data.

## Floci vs Real AWS

Floci support: **partial** for this lab. On real AWS, configure IAM execution roles, CloudWatch Logs, X-Ray/tracing, reserved concurrency, retry/DLQ/destinations, VPC networking when needed, deployment aliases/versions, and alarms for errors/throttles/duration. Real AWS also enforces package size limits, runtime lifecycle, regional concurrency quotas, cold starts, per-ms pricing, and event source mapping behavior that local Floci does not fully model.
