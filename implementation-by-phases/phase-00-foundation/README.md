# Phase 00 - Foundation implementation

Local AWS mental model + Floci SDK baseline.

## What is included

- `src/aws-mental-model.ts` - small helpers for ARNs, regions, and Availability Zones.
- `@floci-lab/aws-clients` shared factory - `awsDefaults`, `flociDefaults`, `createClient(service)`, `getFlociHealth`.
- `src/smoke-tests.ts` - health, S3, SQS, DynamoDB smoke checks.
- `major-projects/floci-lab-bench` - CLI status board for local dev verification.

## Run

```bash
pnpm install
docker compose up -d
pnpm --filter @floci-lab/phase-00 test
pnpm --filter @floci-lab/phase-00 lab
```

## Environment

Defaults target Floci:

```bash
AWS_ENDPOINT_URL=http://localhost:4566
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=test
```

Unset `AWS_ENDPOINT_URL` in production so AWS SDK v3 uses normal provider chain.

## Acceptance checklist

- SDK factory applies endpoint override, dummy credentials, region, retry attempts.
- Smoke tests cover Floci health, S3 bucket lifecycle, SQS queue lifecycle, DynamoDB table lifecycle.
- Lab bench prints green/red board and exits non-zero on failures.
