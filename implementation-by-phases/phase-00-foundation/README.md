# Phase 00 - Foundation

Local AWS + Floci baseline for learning safe enterprise implementation patterns before building later phases.

## What is included

- `src/aws-mental-model.ts` - ARN parsing/building and Availability Zone helpers.
- `src/smoke-tests.ts` - Floci health plus S3, SQS, DynamoDB lifecycle checks.
- `src/enterprise-patterns.ts` - tags, audit events, account masking, retries, client defaults, lifecycle, observability, compliance, backup, DR, and readiness summaries.
- `src/examples/` - focused real-world examples for security, retries, lifecycle, monitoring, compliance, DR, and event-driven processing.
- `major-projects/floci-lab-bench/` - runnable local readiness CLI with enterprise example orchestration.

## Function guide

| Function | Use |
| --- | --- |
| `parseArn`, `buildArn` | Validate and generate ARNs for policies, audit logs, examples, and tests. |
| `availabilityZone` | Pick deterministic AZ names for primary/failover examples. |
| `runFlociSmokeTests` | Verify Floci health and local S3/SQS/DynamoDB readiness. |
| `allPassed`, `renderStatusBoard` | Convert smoke results into CI gates and readable operator output. |
| `buildEnterpriseTags` | Standardize ownership, cost, environment, and data-classification tags. |
| `createAuditEvent`, `maskAccountId` | Produce safe audit records without exposing full account ids. |
| `withRetry`, `enterpriseClientDefaults` | Wrap AWS SDK calls with bounded retry behavior and production-ready defaults. |
| `lifecyclePlanFor` | Document valid retention, backup, DR, compliance, and cost-control choices. |
| `observabilityPlanFor` | Define logs, metrics, alarms, and dashboard widgets for foundation services. |
| `complianceControlsFor` | Map services to auditable controls and evidence statements. |
| `summarizeReadiness` | Turn smoke-test rows into clear pass/fail recommendations. |

## Examples

- `src/examples/secure-access-and-audit.ts` - secure naming, tags, compliance metadata, audit event.
- `src/examples/resilient-client-and-retries.ts` - AWS SDK client defaults with retry wrapper.
- `src/examples/data-lifecycle-cost-backup.ts` - S3/DynamoDB/SQS retention, backup, DR, cost controls.
- `src/examples/event-driven-processing.ts` - SQS event publish with retries, trace metadata, audit logging.
- `src/examples/monitoring-observability-compliance.ts` - smoke results to dashboards, alarms, compliance evidence, and operator guidance.
- `src/examples/disaster-recovery-runbook.ts` - production recovery objective, backup/restore flow, DLQ redrive, cost cleanup.
- `major-projects/floci-lab-bench/src/examples/enterprise-local-readiness.ts` - full readiness workflow.

## Run

```bash
pnpm install
docker compose up -d
pnpm --filter @floci-lab/phase-00 test
pnpm --filter @floci-lab/phase-00 lab
```

## Environment

Defaults target Floci/local AWS:

```bash
AWS_ENDPOINT_URL=http://localhost:4566
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=test
```

Unset `AWS_ENDPOINT_URL` in production so AWS SDK v3 uses the normal AWS provider chain.

## Acceptance checklist

- Client factory supports endpoint override, dummy local credentials, region, and retry attempts.
- Smoke tests cover Floci health, S3 bucket lifecycle, SQS queue lifecycle, and DynamoDB table lifecycle.
- Examples show secure access patterns, audit logging, retries, lifecycle management, event-driven processing, observability-ready output, cost controls, backup/DR, and compliance notes.
- Lab bench prints a green/red board and exits non-zero on failure.
