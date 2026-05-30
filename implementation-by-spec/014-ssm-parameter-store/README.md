# 014 - SSM Parameter Store

Hierarchical application config and lightweight secrets with String, JSON, SecureString, path reads, retries, audit logs, least-privilege IAM, lifecycle, cost, and disaster-recovery patterns.

## Quick start

```bash
docker compose up -d
pnpm install
cd implementation-by-spec/014-ssm-parameter-store
pnpm setup
pnpm seed
pnpm test
pnpm typecheck
pnpm cleanup
```

## Function map

| Area | Functions | Enterprise use case |
|---|---|---|
| Basic parameters | `putStringParameter`, `getStringParameter`, `deleteParameter` | Store/read/delete app config and SecureString values. |
| JSON config | `putJsonParameter`, `getJsonParameter`, `appConfig` | Store typed feature flags or service settings. |
| Hierarchical config | `parameterPath`, `getParametersByPath`, `loadConfigByPath` | Load `/app/env/*` config in one startup flow. |
| Resilience | `withParameterStoreRetry`, `getRequiredStringParameter` | Retry throttles and fail fast when required config is missing. |
| Security/audit | `parameterPathReadPolicy`, `buildParameterAuditLog` | Scope IAM by path/principal tag and log sensitive reads/writes. |
| Lifecycle/ops | `parameterLifecyclePolicy`, `parameterCostOptimizationPlan`, `parameterDisasterRecoveryPlan` | Plan retention, caching, backup/export, and regional restore. |
| Runtime config | `seedServiceRuntimeConfig`, `loadServiceRuntimeConfig` | Seed and load complete service config for ECS/Lambda. |

## Real-world examples

- `src/examples/basic-parameter.ts` - write/read/delete JSON parameter.
- `src/examples/config-path.ts` - build standard `/app/env/key` paths.
- `src/examples/load-config.ts` - load path config into object.
- `src/examples/enterprise-service-config.ts` - seed/load service runtime config with retries, audit, IAM, and cost plan.
- `src/examples/secure-access-audit.ts` - SecureString access, audit logging, IAM path policy, and lifecycle metadata.
- `src/examples/event-driven-refresh.ts` - parameter-change event pattern for config-cache refresh.
- `src/examples/disaster-recovery-cost.ts` - backup/restore, lifecycle, and cost optimization plan.

Run examples with:

```bash
pnpm tsx src/examples/enterprise-service-config.ts
pnpm tsx src/examples/secure-access-audit.ts
pnpm tsx src/examples/event-driven-refresh.ts
pnpm tsx src/examples/disaster-recovery-cost.ts
```

## Beginner workflow

```ts
import { parameterPath, putJsonParameter, getJsonParameter, loadConfigByPath, deleteParameter } from "./src/index.js";

const name = parameterPath("orders", "dev", "features");
await putJsonParameter(name, { checkoutV2: true });
console.log(await getJsonParameter(name));
console.log(await loadConfigByPath("/orders/dev"));
await deleteParameter(name);
```

## Production checklist

- Use names like `/app/env/domain/key`; avoid shared flat names.
- Use SecureString for sensitive values and enforce KMS decrypt permissions separately.
- Scope IAM to exact path prefixes; use principal/resource tags where possible.
- Add audit logs for sensitive reads, writes, deletes, denied access, and restores.
- Cache hot reads and prefer `GetParametersByPath` for startup config to reduce latency/cost.
- Retry only transient throttling/internal failures; fail fast for missing required config.
- Export parameters to encrypted, versioned S3 for backup; test restore into DR region/path.
- Use Secrets Manager for rotation workflows and AppConfig for progressive config rollout.

## Floci vs real AWS

Floci support is partial. Real AWS adds SecureString KMS behavior, parameter versions/labels, standard vs advanced tiers, policies, CloudTrail, throughput quotas, and stricter IAM/KMS controls. Keep examples local-friendly, then add production IAM/KMS/CloudWatch/backup automation in real AWS.
