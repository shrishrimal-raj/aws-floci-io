# TaskFlow API major project

Enterprise task-management backend scenario built from Phase 01 services.

## Scenarios

- Secure tenant-scoped task creation with audit-safe logging.
- DynamoDB single-table task storage and status indexing.
- SNS event fanout plus SQS background processing pattern.
- S3 direct attachment upload pattern.
- SSM config, Secrets Manager JSON secrets, CloudWatch structured logs.
- Retry, redaction, lifecycle archive/delete decisions for compliance and cost control.

## Run

```bash
pnpm --filter @floci-lab/phase-01 taskflow:demo
pnpm --filter @floci-lab/phase-01 taskflow:enterprise
```

`taskflow:demo` prints configured AWS clients. `taskflow:enterprise` runs local learning scenario without real AWS calls.

## Learn by file

- `src/demo.ts` - client wiring across core backend services.
- `src/scenarios/enterprise-saas-workflow.ts` - end-to-end secure SaaS workflow using examples from `src/examples/`.

Full Floci e2e requires service setup scripts for S3, SQS, SNS, and DynamoDB.
