# 013 - Secrets Manager

> Store, read, redact, version, rotate, update, and delete JSON secret values safely.

## Quick start

```bash
docker compose up -d
pnpm install
cd implementation-by-spec/013-secrets-manager
pnpm setup
pnpm seed
pnpm test
pnpm cleanup
```

## Module

- `src/client.ts` - Secrets Manager SDK v3 client for Floci (`http://localhost:4566`).
- `src/use-cases/secrets.ts` - JSON secret create/read/update/version/rotate/delete plus safe redaction helpers.
- `src/examples/basic-secret.ts` - create/read/update/delete JSON secret.
- `src/examples/rotate-secret.ts` - rotate a JSON secret and log redacted previous value.
- `src/examples/redact-secret.ts` - redact secret values and build typed version metadata.
- `scripts/setup.ts` - creates lab secret.
- `scripts/seed.ts` - writes fixture secret value.
- `scripts/cleanup.ts` - force-deletes lab secret.

## Operations covered

| Operation | Function | Notes |
|---|---|---|
| Create JSON secret | `createJsonSecret` | Stores initial JSON `SecretString`; existing secret returns name for lab idempotency. |
| Get raw string | `getSecretString` | Reads `SecretString` by name or ARN. |
| Get JSON secret | `getJsonSecret` | Parses `SecretString` into typed value. |
| Put new version | `putJsonSecretValue` | Adds new secret version. |
| Update secret | `updateJsonSecret` | Replaces current JSON secret value. |
| Rotate JSON secret | `rotateJsonSecret` | Reads previous, writes next, returns redacted previous. |
| Delete secret | `deleteSecret` | Force delete for lab cleanup; missing secrets ignored. |
| Redact secret | `redactSecret` | Replaces top-level values with `***REDACTED***`. |
| Secret version holder | `secretVersion` | Typed name/value/version metadata helper. |

## Use cases

```ts
import { createJsonSecret, getJsonSecret, rotateJsonSecret, deleteSecret } from "./src/index.js";

await createJsonSecret("db/app", { username: "app", password: "old" });
console.log(await getJsonSecret<{ username: string; password: string }>("db/app"));
console.log(await rotateJsonSecret("db/app", { username: "app", password: "new" }));
await deleteSecret("db/app");
```

## Runbook

1. Start Floci: `docker compose up -d`.
2. Check health: `pnpm run floci:health` from repo root.
3. Provision secret: `pnpm setup`.
4. Write fixture value: `pnpm seed`.
5. Run tests: `pnpm test`.
6. Cleanup secret: `pnpm cleanup`.

## Gotchas

- Never log raw secret values. Redact before logging or returning diagnostics.
- Cache secrets briefly in apps to reduce latency/cost, but honor rotation windows.
- Use KMS customer-managed keys when access separation/audit requirements demand it.
- Rotation needs app compatibility: support old/new credentials during transition.
- Force delete is lab-only; production should use recovery windows unless emergency.
- Resource policies can expose secrets cross-account; audit them carefully.

## Floci vs Real AWS

Floci support: **partial** for this lab. On real AWS, configure KMS keys, rotation Lambda, recovery windows, resource policies, replication, CloudTrail audit, IAM least privilege, and alarms for failed rotations. Real AWS also has version stages (`AWSCURRENT`, `AWSPREVIOUS`), deletion recovery windows, per-secret costs, API request costs, cross-region replication, and rotation workflows that local Floci does not fully model.
