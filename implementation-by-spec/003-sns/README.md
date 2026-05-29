# 003 - SNS

> Enterprise pub/sub with standard/FIFO topics, filter policies, SQS/Lambda/HTTP/email-style subscriptions, JSON event envelopes, retries, audit events, subscription summaries, and cost modeling.

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

- `src/client.ts` - SNS SDK v3 client for Floci (`http://localhost:4566`).
- `src/use-cases/topics.ts` - topics, subscriptions, filters, JSON/FIFO publish, retries, audit, summaries, cost.
- `src/examples/basic-topic.ts` - topic + SQS-style subscription + raw publish.
- `src/examples/json-event.ts` - typed JSON event publish with filterable attributes.
- `src/examples/fifo-topic.ts` - FIFO publish with group and deduplication IDs.
- `src/examples/order-event-fanout.ts` - ecommerce fanout with filtered SQS subscriptions, audit, summaries.
- `src/examples/secure-tenant-notifications.ts` - tenant/severity filters, HTTPS subscriber, retry publish.
- `src/examples/fifo-audit-stream.ts` - ordered per-aggregate event stream.
- `src/examples/observability-cost-compliance.ts` - audit event, subscription summary, cost estimate, compliance notes.
- `src/examples/data-lifecycle-integration.ts` - S3 lifecycle command fanout through SNS.
- `scripts/setup.ts` - creates standard/FIFO topics plus filtered SQS subscription.
- `scripts/seed.ts` - publishes fixture event.
- `scripts/cleanup.ts` - unsubscribes and deletes topics.

## Operations covered

| Operation           | Function                                                     | Notes                                                                               |
| ------------------- | ------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| Create/delete topic | `createTopic`, `deleteTopic`                                 | Standard/FIFO topics, display name, idempotent cleanup.                             |
| Subscribe           | `subscribe`, `subscribeSqsWithFilter`                        | SQS/Lambda/HTTP/S/email/SMS/application protocols; SQS helper enables raw delivery. |
| Filter management   | `setSubscriptionFilterPolicy`                                | Route only matching message attributes.                                             |
| Unsubscribe/list    | `unsubscribe`, `listSubscriptions`, `summarizeSubscriptions` | Cleanup and operational visibility.                                                 |
| Publish raw         | `publishMessage`, `publishMessageWithRetry`                  | Subject, attributes, FIFO fields, bounded retry for transient failures.             |
| Publish JSON        | `publishJsonEvent`, `parseTopicEventEnvelope`                | Typed event envelope with `type`, `payload`, `traceId`, `createdAt`.                |
| Publish FIFO        | `publishFifoJsonEvent`, `fifoEventIds`                       | Ordered per-tenant/per-aggregate streams.                                           |
| Attributes          | `topicMessageAttributes`                                     | Filterable string attributes for event type, tenant, severity, trace.               |
| Audit/cost          | `createTopicAuditEvent`, `estimateSnsPublishCost`            | Structured audit payloads and simple publish cost estimate.                         |

## Function examples

### Fanout domain event to filtered subscribers

```ts
const topicArn = await createTopic({ name: "orders" });
await subscribeSqsWithFilter(topicArn, billingQueueArn, {
  eventType: ["order.created", "order.refunded"],
  tenantId: ["acme"],
});
await publishJsonEvent(
  topicArn,
  "order.created",
  { tenantId: "acme", orderId: "o1" },
  "trace-1",
);
```

### Secure tenant notification with retry

```ts
await publishMessageWithRetry({
  topicArn,
  subject: "High severity tenant alert",
  message: JSON.stringify({ tenantId: "acme", alertId: "a1" }),
  attributes: topicMessageAttributes({
    eventType: "tenant.alert",
    tenantId: "acme",
    severity: "high",
  }),
});
```

### FIFO ordered audit stream

```ts
const ids = fifoEventIds("acme", "account", "account.updated", "acct-1");
await publishFifoJsonEvent(
  topicArn,
  ids.groupId,
  ids.deduplicationId,
  "account.updated",
  { accountId: "acct-1" },
);
```

## Real-world scenarios

- **Event-driven fanout** - one domain event routes to SQS workers for billing, fulfillment, search, email, and analytics.
- **Secure access patterns** - publishers get least-privilege `sns:Publish`; subscribers use filter policies for tenant/event/severity isolation.
- **Audit logging** - emit `createTopicAuditEvent` to logs, S3, CloudWatch, or SIEM for publish/delivery evidence.
- **Error handling and retries** - SNS retries delivery; use `publishMessageWithRetry` for transient publish failures and DLQs for subscribers.
- **Data lifecycle** - SNS can notify workers to archive/delete S3 objects; durable lifecycle state belongs in S3/DynamoDB/AWS Backup.
- **AWS integrations** - common subscribers include SQS, Lambda, HTTPS webhooks, email/SMS, and mobile push endpoints.
- **Monitoring** - alarm on failed notifications, high publish errors, DLQ depth, HTTPS failure rate, and SMS spend.
- **Cost optimization** - use filter policies to avoid unnecessary delivery, batch upstream work when possible, and track publish/delivery volume.
- **Compliance** - encrypt sensitive topics with KMS, restrict topic policies, include tenant/trace IDs, and avoid PII in message attributes.

## Runbook

1. Start Floci: `docker compose up -d`.
2. Check health: `pnpm run floci:health` from repo root.
3. Provision topics/subscriptions: `pnpm setup`.
4. Seed event: `pnpm seed`.
5. Run tests: `pnpm test`.
6. Run examples: `pnpm exec tsx src/examples/<file>.ts`.
7. Cleanup: `pnpm cleanup`.

## Testing guidance

- Cover topic create/delete, subscribe/unsubscribe, filter updates, raw publish, JSON publish, FIFO publish, listing, parsing, retry, audit, summaries, and error wrapping.
- Test that filter policies use message attributes, not body fields.
- In production apps, add subscriber contract tests for raw vs SNS envelope payload shape.

## Production checklist

- [ ] Topic policies and IAM scoped to exact topic ARN.
- [ ] SQS queue policies allow SNS topic delivery.
- [ ] KMS encryption enabled for sensitive events.
- [ ] Filter policies documented and tested.
- [ ] Subscribers are idempotent and have DLQs where supported.
- [ ] Delivery failure metrics and alarms configured.
- [ ] Events include `eventType`, `tenantId`, `traceId`, and schema version where useful.
- [ ] Message attributes avoid PII.
- [ ] FIFO topics used only when ordering is required.

## Gotchas

- Filter policies match message attributes, not arbitrary JSON body fields.
- Raw message delivery changes SQS payload shape.
- SQS fanout needs queue policy permission on real AWS.
- FIFO topics require `.fifo` names and message group IDs.
- Email/SMS subscriptions require confirmation and may have sandbox/spend controls.
- SNS is not durable long-term storage; store authoritative state elsewhere.

## Floci vs Real AWS

Floci support: **full** for this lab. On real AWS, verify topic policies, queue policies, KMS, delivery retries/DLQs, subscription confirmation, regional ARNs, FIFO throughput, SMS/email sandbox, CloudWatch delivery metrics, and publish/delivery costs.
