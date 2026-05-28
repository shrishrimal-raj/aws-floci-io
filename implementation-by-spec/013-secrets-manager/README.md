# 013 - Secrets Manager

Store and rotate JSON secret values.

## Quick start
```bash
pnpm setup
pnpm seed
pnpm test
pnpm cleanup
```

## Module
`src/use-cases/secrets.ts` creates JSON secrets, reads/parses secret values, writes new versions, updates, deletes, and redacts values for logs.

## Runbook
Create secret, read at runtime, cache briefly, rotate with `putJsonSecretValue`, never log raw values, cleanup with force delete in lab. Real AWS: configure KMS key, rotation Lambda, resource policies, replication, and audit access.
