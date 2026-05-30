# Floci Lab Bench

CLI readiness gate for local Floci before backend work starts.

## Checks

- `/_floci/health` endpoint
- S3 create/list/delete bucket
- SQS create/list/delete queue
- DynamoDB create/list/delete table

## Enterprise example

`src/examples/enterprise-local-readiness.ts` combines smoke-test orchestration, green/red status output, readiness summary, audit logging, observability plan, and queue lifecycle guidance for a developer workstation or CI gate.

## Run

```bash
docker compose up -d
pnpm --filter @floci-lab/phase-00 lab
```

Any failed row exits with code `1`.
