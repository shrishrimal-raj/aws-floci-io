# 018 - Step Functions

Step Functions learning module for state machine definitions, workflow execution, retries, compensation, observability, cost, lifecycle, and compliance patterns.

## Quick start

```bash
pnpm install
pnpm --filter @floci-lab/step-functions test
pnpm --filter @floci-lab/step-functions setup
pnpm --filter @floci-lab/step-functions seed
pnpm --filter @floci-lab/step-functions cleanup
```

## Module

- `src/client.ts` - Step Functions SDK v3 client for Floci or AWS.
- `src/use-cases/workflows.ts` - Pass ASL, Lambda task states, choice states, order workflow definition, create/start/describe/delete operations.
- `src/use-cases/enterprise.ts` - tenant access guard, workflow input envelope, audit records, retry backoff, secure execution starter, observability, cost, lifecycle, DR, compliance helpers.
- `src/examples/basic-workflow.ts` - create, start, and delete a basic workflow.
- `src/examples/enterprise-order-orchestration.ts` - end-to-end order workflow with validation, payment, fulfillment, audit, compensation.
- `src/examples/secure-workflow-start.ts` - tenant-safe execution input and audit record.
- `src/examples/payment-saga-compensation.ts` - payment saga with choice, retry, catch, compensation.
- `src/examples/compliance-lifecycle-dr.ts` - retention, PII minimization, standby recovery, compliance controls.
- `src/examples/observability-cost-runbook.ts` - alarms, transition cost, retry, operations runbook.

## Enterprise patterns

Keep workflow input small and tenant-scoped. Pass `tenantId`, `correlationId`, `idempotencyKey`, `schemaVersion`, and `requestId` to every execution. Use retries for transient task failures, `Catch` paths for compensation, audit records for workflow starts/results, and idempotent business writes outside the workflow.

## Floci vs real AWS

Floci supports local workflow basics. Real AWS requires IAM execution roles, CloudWatch Logs/X-Ray, encryption, quotas, tagging, versioned ASL deployments, alarms, payload size checks, and failure runbooks. Standard workflows charge by transitions, so avoid runaway loops and noisy polling.

## Production checklist

- Security: tenant/role checks before `StartExecution`; least-privilege state machine role.
- Audit: record attempts, starts, failures, denied access, execution ARN, correlation ID.
- Reliability: task retries, catch/compensation paths, idempotency keys, redrive runbook.
- Lifecycle: redact PII, retain audit evidence, expire temporary payloads.
- Observability: alarms for failures, timeouts, throttling, high transition count, duration.
- Cost: estimate transitions, prefer Express only for valid high-volume short workflows.
- DR: version ASL in Git, redeploy cross-region, recover from durable business state.
