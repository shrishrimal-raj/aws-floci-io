# 015 - EventBridge

> Event buses, rules, targets, event patterns, single-event publishing, batch publishing, and dependency-safe cleanup.

## Quick start

```bash
docker compose up -d
pnpm install
cd implementation-by-spec/015-eventbridge
pnpm setup
pnpm seed
pnpm test
pnpm cleanup
```

## Module

- `src/client.ts` - EventBridge SDK v3 client for Floci (`http://localhost:4566`).
- `src/use-cases/events.ts` - bus creation, event patterns, rules, targets, single/batch publishing, rule/bus cleanup.
- `src/examples/basic-event.ts` - create bus, publish event, cleanup.
- `src/examples/batch-events.ts` - publish multiple typed events in one request.
- `src/examples/rule-target.ts` - build event pattern and attach target to rule.
- `scripts/setup.ts` - creates lab bus/rule.
- `scripts/seed.ts` - publishes fixture event.
- `scripts/cleanup.ts` - removes targets/rules and deletes bus.

## Operations covered

| Operation | Function | Notes |
|---|---|---|
| Create bus | `createBus` | Custom bus; existing bus returns name for lab idempotency. |
| Event pattern | `eventPattern` | Matches `source` and `detail-type`. |
| Put rule | `putRule` | Creates rule with JSON event pattern. |
| Put target | `putTarget` | Attaches target ARN to rule. |
| Rule + target | `putRuleTarget` | Creates rule and attaches one target. |
| Publish event | `publishEvent` | Sends one JSON event to bus. |
| Publish batch | `publishEvents` | Sends multiple events in one `PutEvents` call. |
| Delete rule | `deleteRuleWithTargets` | Removes targets first, then deletes rule. |
| Delete bus | `deleteBus` | Idempotent cleanup for missing buses. |

## Use cases

```ts
import { createBus, putRuleTarget, publishEvent, deleteRuleWithTargets, deleteBus } from "./src/index.js";

await createBus("orders");
await putRuleTarget("orders-created", "orders", "app.orders", "order.created", "arn:aws:sqs:us-east-1:000000000000:orders");
await publishEvent("orders", "app.orders", "order.created", { orderId: "o1" });
await deleteRuleWithTargets("orders-created", "orders", ["target"]);
await deleteBus("orders");
```

## Runbook

1. Start Floci: `docker compose up -d`.
2. Check health: `pnpm run floci:health` from repo root.
3. Provision bus/rule: `pnpm setup`.
4. Publish fixture event: `pnpm seed`.
5. Run tests: `pnpm test`.
6. Cleanup targets/rules/bus: `pnpm cleanup`.

## Gotchas

- Event pattern field is `detail-type`, while SDK input field is `DetailType`.
- PutEvents accepts JSON strings for `Detail`; stringify objects once.
- Targets often need resource policies/permissions in real AWS (SQS, Lambda, cross-account buses).
- Delete order matters: remove targets before deleting rules, delete rules before custom bus.
- EventBridge delivery is asynchronous. Consumers must be idempotent and retry-safe.
- Use DLQs/retry policies for targets that can fail.

## Floci vs Real AWS

Floci support: **partial** for this lab. On real AWS, configure archives/replay, schema registry, bus policies, cross-account routing, target retry/DLQ settings, CloudWatch metrics/alarms, and least-privilege IAM. Real AWS also has event size limits, PutEvents batch limits, eventual delivery, per-event pricing, target-specific permissions, and archive/replay costs that local Floci does not fully model.
