# Phase 01 - Core Backend Services

> **Theme**: The 10 services every backend engineer must know
> **Difficulty**: 2/5
> **Estimated time**: 3 weeks

## Learning goals
- Master object storage (S3), queues (SQS), pub/sub (SNS), and NoSQL (DynamoDB)
- Wire serverless compute (Lambda) behind API Gateway
- Manage config and secrets with SSM Parameter Store and Secrets Manager
- Ship logs to CloudWatch Logs with structured JSON

## Services covered
- [001 - S3](../../spec-by-services/001-s3/README.md)
- [002 - SQS](../../spec-by-services/002-sqs/README.md)
- [003 - SNS](../../spec-by-services/003-sns/README.md)
- [004 - DynamoDB](../../spec-by-services/004-dynamodb/README.md)
- [006 - Lambda](../../spec-by-services/006-lambda/README.md)
- [007 - API Gateway v1 (REST)](../../spec-by-services/007-api-gateway-v1/README.md)
- [008 - API Gateway v2 (HTTP)](../../spec-by-services/008-api-gateway-v2/README.md)
- [013 - Secrets Manager](../../spec-by-services/013-secrets-manager/README.md)
- [014 - SSM Parameter Store](../../spec-by-services/014-ssm-parameter-store/README.md)
- [019 - CloudWatch Logs](../../spec-by-services/019-cloudwatch-logs/README.md)

## Concepts to master
- Single-table design in DynamoDB
- S3 presigned URLs for direct browser uploads
- SQS visibility timeout, long polling, redrive policies
- SNS fanout topology (SNS → multiple SQS)
- Lambda execution model, cold starts, concurrency
- API Gateway REST (v1) vs HTTP (v2) trade-offs
- Hierarchical SSM parameters with `/app/env/key` naming
- Secrets Manager rotation lambdas

## Mini-projects
- Presigned S3 upload service
- SQS worker with retries and DLQ
- SNS → SQS fanout for notifications
- DynamoDB single-table for users + orders
- Lambda + API Gateway CRUD endpoint

## Major real-world project
**TaskFlow API** - A multi-tenant task management REST API with file attachments (S3), background processors (SQS+Lambda), email notifications (SNS), structured logging (CW Logs), config via SSM, and DB credentials in Secrets Manager. Mimics a real internal-tools backend used by ops teams.

Lives in: `implementation-by-phases/phase-01-core-backend/major-projects/taskflow-api/`

## Folder structure
```
implementation-by-phases/phase-01-core-backend/
├── README.md
├── package.json
├── src/
├── tests/
└── major-projects/
    └── taskflow-api/
```

## Codex CLI prompt
See `prompts/phases/phase-01.md`.

## Acceptance criteria
- All service folders for this phase have green tests.
- The major project runs end-to-end against Floci.
- Documentation is complete.

## Tests to run
```bash
docker compose up -d
cd implementation-by-spec/001-s3 && pnpm test && cd -
cd implementation-by-spec/002-sqs && pnpm test && cd -
cd implementation-by-spec/003-sns && pnpm test && cd -
cd implementation-by-spec/004-dynamodb && pnpm test && cd -
cd implementation-by-spec/006-lambda && pnpm test && cd -
cd implementation-by-spec/007-api-gateway-v1 && pnpm test && cd -
cd implementation-by-spec/008-api-gateway-v2 && pnpm test && cd -
cd implementation-by-spec/013-secrets-manager && pnpm test && cd -
cd implementation-by-spec/014-ssm-parameter-store && pnpm test && cd -
cd implementation-by-spec/019-cloudwatch-logs && pnpm test && cd -
cd implementation-by-phases/phase-01-core-backend && pnpm test
```

## Common bugs to debug
- Visibility timeout < processing time → message redelivered
- Missing IAM permissions on Lambda execution role
- DynamoDB hot partition due to bad PK design
- API Gateway CORS misconfiguration

## What a real production version would add
Production adds X-Ray tracing, dead-letter queues with replay tooling, request validation at API Gateway, and per-tenant isolation in IAM policies.

## Recommended order
Complete services in the order listed under 'Services covered' before tackling the major project.
