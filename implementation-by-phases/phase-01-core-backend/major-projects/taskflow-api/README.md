# TaskFlow API

Multi-tenant task-management backend skeleton for Phase 01.

## Implemented pieces

- Tenant-scoped task model and DynamoDB single-table keys.
- Repository methods for create/get/list/status update.
- S3 presigned attachment uploads.
- SNS task event publishing and SQS background enqueue.
- SSM config, Secrets Manager JSON, CloudWatch JSON logs.
- Lambda/API Gateway handler boundary.

## Demo

```bash
pnpm --filter @floci-lab/phase-01 taskflow:demo
```

Full e2e needs Floci resources from service setup scripts.
