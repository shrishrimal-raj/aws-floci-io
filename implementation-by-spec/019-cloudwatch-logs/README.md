# 019 - CloudWatch Logs

Log groups, streams, structured JSON events, retention, filtering, metric/subscription plans, secure audit patterns, cost control, and disaster recovery.

## Quick start

```bash
docker compose up -d
pnpm install
cd implementation-by-spec/019-cloudwatch-logs
pnpm setup
pnpm seed
pnpm test
pnpm typecheck
pnpm cleanup
```

## Function map

| Area | Functions | Enterprise use case |
|---|---|---|
| Groups/streams | `createLogGroup`, `createLogStream`, `deleteLogGroup` | Provision and clean app log groups/streams safely. |
| Events/query | `putJsonLog`, `filterLogs`, `structuredLog` | Write searchable JSON logs and triage incidents by filter pattern. |
| Naming/filter helpers | `appLogGroupName`, `safeLogStreamName`, `jsonFilterPattern` | Standardize `/aws/app/app/env`, stream names, and JSON filters. |
| Retention/lifecycle | `putRetentionDays`, `logLifecyclePlan`, `enforceLogRetention` | Enforce dev/prod/regulated retention and export requirements. |
| Security/audit | `redactSensitiveFields`, `enterpriseApplicationLog`, `buildLogAuditEntry`, `logGroupReadPolicy` | Redact secrets, audit log access, and scope cross-account reads. |
| Observability/events | `metricFilterPlan`, `subscriptionFilterPlan` | Plan alarms and stream logs to Lambda, Firehose, Kinesis, or OpenSearch. |
| Resilience/ops | `withCloudWatchLogsRetry`, `logCostOptimizationPlan`, `logDisasterRecoveryPlan` | Retry throttles, reduce ingestion cost, export backups cross-region. |

## Real-world examples

- `src/examples/basic-logs.ts` - create group/stream, write JSON log, clean up.
- `src/examples/structured-log.ts` - structured app logs, redaction, JSON filter pattern.
- `src/examples/retention-filter.ts` - lifecycle, error metric, and cost plan.
- `src/examples/enterprise-observability.ts` - checkout API logs, retry, metric filter, subscription, IAM, audit.
- `src/examples/security-audit-compliance.ts` - regulated audit logs, redaction, Firehose archive, DR.
- `src/examples/event-driven-pipeline.ts` - stream fraud-alert logs to event processing pipeline.

Run local-only examples:

```bash
pnpm tsx src/examples/structured-log.ts
pnpm tsx src/examples/retention-filter.ts
pnpm tsx src/examples/enterprise-observability.ts
pnpm tsx src/examples/security-audit-compliance.ts
pnpm tsx src/examples/event-driven-pipeline.ts
```

## Beginner workflow

```ts
import { appLogGroupName, createLogGroup, createLogStream, putJsonLog, structuredLog } from "./src/index.js";

const group = appLogGroupName("orders-api", "dev");
await createLogGroup(group);
await createLogStream(group, "app");
await putJsonLog(group, "app", structuredLog("INFO", "order.created", { orderId: "o1" }));
```

## Production checklist

- Use structured JSON fields: `level`, `message`, `time`, `service`, `environment`, `tenantId`, `correlationId`.
- Redact tokens, passwords, authorization headers, card data, and PII before logging.
- Set retention for every log group; keep non-prod short and regulated logs longer.
- Use metric filters/alarms for errors, throttles, auth failures, and delivery lag.
- Use subscription filters for event-driven processing, security archives, analytics, or incident routing.
- Scope IAM by log-group prefix and account role; audit sensitive queries and retention changes.
- Control cost with sampling, lower debug volume, shorter retention, and S3/Firehose archive.
- Export critical logs to encrypted replicated S3 for backup/disaster recovery.

## Floci vs real AWS

Floci support is partial. Real AWS adds strict IAM, quotas, sequence-token behavior, async subscription delivery, cross-account policies, CloudTrail, KMS/S3 exports, and CloudWatch pricing details. Keep examples local-friendly, then add production IAM/KMS/alarms/export automation in real AWS.
