# 013 - Secrets Manager

Store, read, redact, rotate, audit, and lifecycle-manage JSON secrets safely with AWS SDK v3 and Floci.

## Quick start

```bash
docker compose up -d
pnpm install
cd implementation-by-spec/013-secrets-manager
pnpm typecheck
pnpm test
pnpm setup && pnpm seed && pnpm cleanup
```

## What you learn

- **JSON secrets**: create, read raw string, parse typed JSON, update, version, rotate, delete.
- **Secure access**: namespace checks with `assertSecretNameAllowed` for tenant/service isolation.
- **Safe logging**: top-level and deep redaction helpers for diagnostics and audit logs.
- **Audit trails**: structured `secretAuditEvent` for read/update/rotate/delete decisions.
- **Reliability**: `withSecretRetry` for transient throttling/timeouts.
- **Lifecycle**: metadata reads, rotation/delete decisions, recovery-window delete.
- **FinOps**: monthly Secrets Manager cost estimate from secret count and API calls.
- **Event-driven refresh**: model rotation event handling and cache invalidation.

## Key files

- `src/client.ts` - Secrets Manager client for Floci endpoint.
- `src/use-cases/secrets.ts` - all production-ready helper functions.
- `src/examples/basic-secret.ts` - create/read/update/delete walkthrough.
- `src/examples/secure-database-credentials.ts` - tenant namespace, retry, audit pattern.
- `src/examples/audit-rotation-workflow.ts` - rotation with redacted previous value.
- `src/examples/lifecycle-cost-governance.ts` - lifecycle + cost forecast without AWS calls.
- `src/examples/event-driven-secret-refresh.ts` - rotation event/cache refresh pattern.
- `scripts/setup.ts`, `seed.ts`, `cleanup.ts` - lab resource lifecycle.

## Operations covered

| Function | Purpose |
|---|---|
| `createJsonSecret` | Create JSON secret; existing secret is idempotent for labs. |
| `getSecretString` / `getJsonSecret` | Read raw or typed secret values. |
| `putJsonSecretValue` / `updateJsonSecret` | Add version or replace current value. |
| `rotateJsonSecret` | Read previous, write next, return redacted previous. |
| `deleteSecret` / `deleteSecretWithRecovery` | Lab force-delete or production recovery-window delete. |
| `getSecretMetadata` | Read lifecycle metadata. |
| `redactSecret` / `redactSecretDeep` | Safe logging helpers. |
| `secretAuditEvent` | Compliance/audit event builder. |
| `assertSecretNameAllowed` | Prefix-based secure access guard. |
| `withSecretRetry` | Retry transient failures. |
| `secretLifecycleDecision` | Rotate/delete decision helper. |
| `estimateSecretsManagerMonthlyCost` | Simple FinOps estimate. |

## Example commands

```bash
pnpm example:lifecycle
pnpm example:event-refresh
# require Floci running:
pnpm example:secure-db
pnpm example:rotation
```

## Production notes

Never log raw secret values. Prefer recovery-window delete in production. Use IAM least privilege, KMS customer-managed keys where required, CloudTrail auditing, rotation alarms, and short application caches that honor rotation windows. Validate resource policies before cross-account sharing.

## Floci vs real AWS

Floci support is partial. Real AWS adds version stages (`AWSCURRENT`, `AWSPREVIOUS`), rotation Lambdas, recovery windows, KMS key policies, CloudTrail events, cross-region replication, resource policies, and per-secret/API-call pricing.
