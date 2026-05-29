# 014 - SSM Parameter Store

> Hierarchical application config and lightweight secrets with string parameters, JSON parameters, SecureString support, path reads, and config path helpers.

## Quick start

```bash
docker compose up -d
pnpm install
cd implementation-by-spec/014-ssm-parameter-store
pnpm setup
pnpm seed
pnpm test
pnpm cleanup
```

## Module

- `src/client.ts` - SSM SDK v3 client for Floci (`http://localhost:4566`).
- `src/use-cases/parameters.ts` - string/json parameters, SecureString writes, path reads, config loading, delete, path builders.
- `src/examples/basic-parameter.ts` - write/read/delete parameter.
- `src/examples/config-path.ts` - build hierarchical config path and typed holder.
- `src/examples/load-config.ts` - write parameter then load config by path.
- `scripts/setup.ts` - creates lab parameters.
- `scripts/seed.ts` - writes fixture config.
- `scripts/cleanup.ts` - deletes lab parameters.

## Operations covered

| Operation | Function | Notes |
|---|---|---|
| Put string | `putStringParameter` | Writes `String` or `SecureString` with overwrite. |
| Get string | `getStringParameter` | Reads value, decrypting by default. |
| Put JSON | `putJsonParameter` | Serializes JSON into parameter value. |
| Get JSON | `getJsonParameter` | Parses typed JSON parameter. |
| Read path | `getParametersByPath` | Recursive path read with decryption. |
| Load config | `loadConfigByPath` | Converts path params into key/value object. |
| Delete parameter | `deleteParameter` | Idempotent cleanup for missing params. |
| Build path | `parameterPath` | `/app/env/key` naming helper. |
| Config holder | `appConfig` | Typed path/value holder. |

## Use cases

```ts
import { parameterPath, putJsonParameter, getJsonParameter, loadConfigByPath, deleteParameter } from "./src/index.js";

const name = parameterPath("orders", "dev", "features");
await putJsonParameter(name, { checkoutV2: true });
console.log(await getJsonParameter(name));
console.log(await loadConfigByPath("/orders/dev"));
await deleteParameter(name);
```

## Runbook

1. Start Floci: `docker compose up -d`.
2. Check health: `pnpm run floci:health` from repo root.
3. Provision parameters: `pnpm setup`.
4. Seed fixture config: `pnpm seed`.
5. Run tests: `pnpm test`.
6. Cleanup parameters: `pnpm cleanup`.

## Gotchas

- Use consistent hierarchical names: `/app/env/domain/key`.
- SecureString still needs IAM/KMS controls; do not treat it as magic secrecy.
- Parameter Store has size/tier limits; use Secrets Manager for rotation workflows.
- Cache reads in hot paths to reduce latency/cost and avoid throttling.
- Path IAM can grant broad access; scope prefixes carefully by app/env.
- JSON parameters are convenient but lose field-level audit/version semantics.

## Floci vs Real AWS

Floci support: **partial** for this lab. On real AWS, configure KMS keys for SecureString, parameter policies/tiering where needed, IAM boundaries by path, CloudTrail audit, caching, and alarms for throttling/errors. Real AWS also has standard/advanced tiers, version history, labels, throughput quotas, parameter policies, and KMS decrypt permissions that local Floci does not fully model.
