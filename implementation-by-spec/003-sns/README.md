# 003 - SNS

> Enterprise pub/sub with standard/FIFO topics, filtered fanout, secure multi-tenant routing, audit/compliance patterns, and practical cost/operations guidance.

## Quick start

```bash
docker compose up -d
pnpm install
cd implementation-by-spec/003-sns
pnpm setup
pnpm seed
pnpm test
pnpm cleanup
```

## Module

- `src/client.ts` - SNS SDK v3 client wired for Floci.
- `src/use-cases/topics.ts` - topic lifecycle, subscriptions, filtering, publish variants, retry, audit, tags, policies, attributes, alarms, and cost helpers.
- `scripts/setup.ts` - creates baseline standard/FIFO/compliance/DR topics and sink subscription.
- `scripts/seed.ts` - publishes fixture domain/compliance/DR events.
- `scripts/cleanup.ts` - unsubscribes and deletes created topics/queue.

### Examples (`src/examples`)

- `basic-topic.ts` - standard topic + SQS subscription + raw publish.
- `json-event.ts` - typed JSON envelope publish and parse workflow.
- `fifo-topic.ts` - FIFO topic ordering with group/dedup IDs.
- `fifo-audit-stream.ts` - ordered audit stream per aggregate.
- `order-event-fanout.ts` - ecommerce fanout to filtered subscribers.
- `secure-tenant-notifications.ts` - tenant/severity-isolated HTTPS notifications with retry.
- `observability-cost-compliance.ts` - audit event + subscription summary + publish cost.
- `data-lifecycle-integration.ts` - SNS command fanout for data lifecycle workflows.
- `integration-sns-sqs-lambda-http.ts` - multi-protocol integration fanout.
- `backup-disaster-recovery-drill.ts` - DR drill with fallback queue pattern.
- `compliance-kms-policy-audit.ts` - KMS attributes, tags, permissions, and audit.
- `cost-optimization-fanout.ts` - filtered fanout cost optimization modeling.

## Operations covered

| Operation | Function | Notes |
| --- | --- | --- |
| Create/delete topic | `createTopic`, `deleteTopic` | Standard/FIFO topics and idempotent cleanup |
| Topic attributes | `getTopicAttributes`, `setTopicAttributes`, `buildComplianceTopicAttributes` | Display/policy/KMS compliance controls |
| Subscribe/unsubscribe | `subscribe`, `subscribeSqsWithFilter`, `setSubscriptionFilterPolicy`, `unsubscribe` | Protocol routing and filter updates |
| Subscription visibility | `listSubscriptions`, `summarizeSubscriptions` | Operational visibility and runbook summary |
| Publish | `publishMessage`, `publishMessageWithRetry` | Raw publish with bounded retry |
| JSON/FIFO publish | `publishJsonEvent`, `publishFifoJsonEvent`, `parseTopicEventEnvelope`, `fifoEventIds` | Typed envelopes and ordering |
| Attributes and routing | `topicMessageAttributes`, `validateTenantFilterPolicy` | Filterable event metadata and tenant guardrails |
| Governance | `tagTopic`, `listTopicTags`, `untagTopic` | Cost allocation and metadata governance |
| Access control | `addTopicPermission`, `removeTopicPermission` | Cross-account least-privilege policy statements |
| Audit/monitoring/cost | `createTopicAuditEvent`, `planSnsAlarms`, `estimateSnsPublishCost`, `estimateSnsFanoutCost` | Enterprise operations and FinOps |

## Function examples

### Fanout domain event with tenant filter

```ts
const topicArn = await createTopic({ name: "orders-events" });
await subscribeSqsWithFilter(topicArn, queueArn, {
  eventType: ["order.created", "order.refunded"],
  tenantId: ["acme"],
});
await publishJsonEvent(topicArn, "order.created", { tenantId: "acme", orderId: "o1" }, "trace-1");
```

### Compliance topic setup

```ts
await setTopicAttributes(
  topicArn,
  buildComplianceTopicAttributes("alias/pii-events-key", {
    enforceSslOnlyPolicy: true,
  }),
);
await tagTopic(topicArn, {
  Environment: "prod",
  DataClassification: "PII",
  Owner: "compliance-team",
});
```

### Fanout cost modeling

```ts
const estimate = estimateSnsFanoutCost({
  publishes: 20_000_000,
  averageDeliveriesPerPublish: 2.1,
});
```

## Enterprise scenario map

- **Event-driven processing** - order/invoice/domain fanout to independent workers.
- **Secure access patterns** - topic permissions, tenant filter policies, HTTPS-only policy option.
- **Audit logging** - structured `createTopicAuditEvent` payloads with trace and tenant IDs.
- **Error handling and retries** - publish retry with bounded backoff; downstream subscribers remain idempotent.
- **Data lifecycle integration** - lifecycle commands distributed to SQS/Lambda workers.
- **AWS integrations** - SQS, Lambda, HTTPS, email-style protocols.
- **Monitoring and observability** - subscription summaries and alarm planning (`planSnsAlarms`).
- **Cost optimization** - reduce fanout with tighter filters; model delivery-driven request cost.
- **Backup and DR** - fallback queue subscription drill pattern.
- **Compliance implementations** - KMS topic attributes, tagging, least-privilege topic permissions.

## Runbook

1. Start Floci: `docker compose up -d`
2. Validate health: `pnpm run floci:health` (repo root)
3. Provision resources: `pnpm setup`
4. Seed events: `pnpm seed`
5. Run tests: `pnpm test`
6. Run examples: `pnpm exec tsx src/examples/<file>.ts`
7. Cleanup: `pnpm cleanup`

## Testing guidance

- Validate create/delete topic, subscribe/unsubscribe, filter updates, publish/raw/json/fifo/retry, and list/summarize.
- Validate governance and compliance helpers (attributes, tags, permissions, policy helper, tenant filter guard).
- Validate cost and alarm helper outputs.
- In production apps, add contract tests per subscriber protocol and payload shape.

## Production checklist

- [ ] IAM and topic policies scoped to exact topic ARN.
- [ ] SQS queue policies permit SNS delivery where used.
- [ ] Sensitive topics use KMS encryption and TLS-only policies.
- [ ] Filter policies are documented, tested, and tenant-safe.
- [ ] Subscriber handlers are idempotent and have DLQs where applicable.
- [ ] Alarms exist for publish failures, notification failures, and unusual publish spikes.
- [ ] Event attributes include `eventType`, `tenantId`, `traceId` (and schema version where needed).
- [ ] Cost dashboards track publish volume and fanout delivery volume.

## Gotchas

- Filter policies evaluate message attributes, not arbitrary JSON body fields.
- Raw delivery changes payload shape for SQS subscribers.
- Email/SMS subscriptions require confirmation and operational controls.
- FIFO topics require `.fifo` names and group/dedup IDs.
- SNS is delivery transport, not long-term source-of-truth storage.

## Floci vs real AWS

Floci support is suitable for local learning. In real AWS, verify IAM/topic/queue policies, KMS permissions, protocol confirmation flows, delivery retry/DLQ behavior, regional quotas, and actual pricing.