# 006 - Lambda

Serverless functions: create, update, invoke, delete, and handler response helpers.

## Quick start
```bash
pnpm setup
pnpm seed
pnpm test
pnpm cleanup
```

## Module
`src/use-cases/functions.ts` wraps Lambda SDK operations and JSON invocation.

## Runbook
Package code, create function with env vars, invoke, monitor errors/duration, cleanup. Floci support: partial; real AWS needs IAM role, logs, retries, DLQ/destinations, concurrency controls, and alarms.
