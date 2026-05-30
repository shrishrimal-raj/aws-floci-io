# Phase 01 - Core Backend Services

TaskFlow is a compact enterprise-style backend slice for learning core AWS services with Node.js and Floci.

## What you learn

- **API + Lambda boundary**: `createTaskFlowHandler` validates requests, writes tasks, publishes events, and logs audit data.
- **DynamoDB single-table model**: tenant partition keys, task sort keys, status GSI, conditional writes, status updates.
- **S3 attachments**: tenant-scoped presigned uploads with safe object keys and metadata.
- **SNS + SQS messaging**: domain events for fanout and background work with retry examples.
- **SSM + Secrets Manager**: environment config and JSON secret loading.
- **CloudWatch Logs**: structured JSON logs for operations and audit trails.
- **Enterprise patterns**: tenant isolation, audit events, redaction, retries, lifecycle/archive/delete decisions.

## Run

```bash
pnpm install
pnpm --filter @floci-lab/phase-01 typecheck
pnpm --filter @floci-lab/phase-01 test
pnpm --filter @floci-lab/phase-01 taskflow:demo
pnpm --filter @floci-lab/phase-01 taskflow:enterprise
```

## Key files

- `src/taskflow-model.ts` - task domain model, DynamoDB keys, item mapping.
- `src/task-repository.ts` - create/get/list/status repository methods.
- `src/api-handler.ts` - API/Lambda handler with persistence, events, retry, and audit logging.
- `src/messaging.ts` - SNS/SQS event builders and clients.
- `src/attachments.ts` - S3 presigned upload service.
- `src/config-secrets-logs.ts` - SSM, Secrets Manager, CloudWatch helpers.
- `src/enterprise-patterns.ts` - security, audit, retry, redaction, lifecycle helpers.
- `src/examples/` - focused real-world examples.
- `major-projects/taskflow-api/` - combined enterprise SaaS workflow scenario.

## Floci prep for full e2e

```bash
docker compose up -d
pnpm --filter @floci-lab/s3 setup
pnpm --filter @floci-lab/sqs setup
pnpm --filter @floci-lab/sns setup
pnpm --filter @floci-lab/dynamodb setup
```

## Architecture

1. API Gateway invokes Lambda-style handler.
2. Handler validates tenant request and writes task to DynamoDB.
3. TaskCreated event publishes to SNS with tenant/event attributes.
4. Background jobs use SQS for retries and DLQ-ready processing.
5. Attachments upload directly to S3 through presigned URLs.
6. Config comes from SSM; secrets come from Secrets Manager.
7. CloudWatch JSON logs capture audit-safe operational events.
8. Lifecycle job can archive or delete old completed tasks for cost and compliance.
