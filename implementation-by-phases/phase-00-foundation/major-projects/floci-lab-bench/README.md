# Floci Lab Bench

CLI that verifies local Floci before backend work starts.

## Checks

- `/_floci/health` endpoint
- S3 create/list/delete bucket
- SQS create/list/delete queue
- DynamoDB create/list/delete table

## Run

```bash
docker compose up -d
pnpm --filter @floci-lab/phase-00 lab
```

Output is green/red status board. Any failed row exits with code `1`.
