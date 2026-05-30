# 017 - EventBridge Pipes

Build source-to-target pipes with filters, lifecycle controls, audit logs, retries, monitoring, and cost governance.

## Quick start

```bash
docker compose up -d
pnpm install
cd implementation-by-spec/017-eventbridge-pipes
pnpm typecheck
pnpm test
pnpm setup && pnpm seed && pnpm cleanup
```

## What you learn

- **Pipe lifecycle**: create, describe, start, stop, delete.
- **Filtering**: SQS body filters and tenant/event-type filters.
- **Secure access**: pipe IAM role is required; examples redact ARNs before logs.
- **Audit logging**: structured audit events for create/start/stop/delete/route actions.
- **Reliability**: retry transient control-plane failures.
- **Monitoring**: failure alarm payloads for command-center dashboards.
- **Lifecycle governance**: stop idle pipes and delete long-stopped pipes.
- **FinOps**: estimate monthly request-processing cost.

## Key files

- `src/client.ts` - EventBridge Pipes client for Floci endpoint.
- `src/use-cases/pipes.ts` - all pipe helpers and enterprise utilities.
- `src/examples/basic-pipe.ts` - create/delete pipe with local ARNs.
- `src/examples/filter-pattern.ts` - tenant-filtered SQS to EventBridge pattern.
- `src/examples/lifecycle.ts` - idle lifecycle, cost, and alarm example.
- `src/examples/enterprise-order-routing.ts` - full enterprise routing scenario.
- `scripts/setup.ts`, `seed.ts`, `cleanup.ts` - lab lifecycle scripts.

## Operations covered

| Function | Purpose |
|---|---|
| `createPipe` | Create source-to-target pipe with optional filter. |
| `describePipe` | Read pipe configuration/state. |
| `startPipe` / `stopPipe` | Control delivery without deleting config. |
| `deletePipe` | Idempotent cleanup. |
| `sqsToEventBusFilter` / `tenantEventFilter` | Build source filter patterns. |
| `pipeName` | Stable enterprise naming helper. |
| `pipeAuditEvent` | Audit event builder. |
| `redactPipeSpec` | Safe diagnostic view of pipe spec. |
| `withPipeRetry` | Retry transient failures. |
| `pipeLifecycleDecision` | Stop/delete idle resources. |
| `estimatePipeMonthlyCost` | Request-volume cost estimate. |
| `pipeFailureAlarm` | Monitoring alarm payload helper. |

## Example commands

```bash
pnpm example:filter
pnpm example:lifecycle
pnpm example:enterprise
```

## Production notes

Use least-privilege IAM for source, target, and pipe management. Configure filters to reduce cost and downstream load. Add DLQ/failure handling where supported by source/target pattern, alarms for failures/throttling/lag, and idempotent consumers for replay safety.

## Floci vs real AWS

Floci support is partial. Real AWS adds regional quotas, IAM policy evaluation, CloudWatch pipe metrics, retries, enrichment, target-specific parameters, pricing, and asynchronous delivery semantics that local labs may not fully model.
