# Phase 01 - Core Backend Services implementation

TaskFlow API learning slice for 10 essential backend services.

## Services covered

- S3: attachment presigned upload keys and URLs.
- SQS: background processor queue messages.
- SNS: tenant-scoped event fanout.
- DynamoDB: single-table `TENANT#...` + `TASK#...` model with status GSI.
- Lambda: handler boundary represented by `createTaskFlowHandler`.
- API Gateway v1/v2: clients wired for REST/HTTP API labs.
- Secrets Manager: JSON secret reader.
- SSM Parameter Store: `/taskflow/{env}/{name}` config reader.
- CloudWatch Logs: structured JSON log writer.

## Run

```bash
pnpm install
pnpm --filter @floci-lab/phase-01 test
pnpm --filter @floci-lab/phase-01 taskflow:demo
```

## Floci e2e prep

```bash
docker compose up -d
pnpm --filter @floci-lab/s3 setup
pnpm --filter @floci-lab/sqs setup
pnpm --filter @floci-lab/sns setup
pnpm --filter @floci-lab/dynamodb setup
```

## TaskFlow architecture

1. API Gateway invokes Lambda handler.
2. Handler writes task items to DynamoDB single table.
3. Attachments upload direct to S3 using presigned URLs.
4. Task events publish to SNS for fanout.
5. Background work enqueues to SQS and retries via DLQ in service lab.
6. Runtime config comes from SSM; credentials/secrets from Secrets Manager.
7. JSON operational events write to CloudWatch Logs.
