#!/usr/bin/env tsx
import { pipeAuditEvent, pipeName, redactPipeSpec, tenantEventFilter } from "../use-cases/pipes.js";

const name = pipeName({ app: "orders", environment: "prod", source: "sqs", target: "eventbus" });
const spec = {
  name,
  sourceArn: "arn:aws:sqs:us-east-1:123456789012:orders-prod",
  targetArn: "arn:aws:events:us-east-1:123456789012:event-bus/orders-prod",
  roleArn: "arn:aws:iam::123456789012:role/orders-pipe-role",
  filterPattern: tenantEventFilter("tenant-a", ["order.created", "order.cancelled"]),
};

console.log({
  scenario: "tenant-filtered-sqs-to-eventbus",
  spec: redactPipeSpec(spec),
  audit: pipeAuditEvent({ pipeName: name, actor: "platform-deployer", action: "create", outcome: "success", details: { filter: spec.filterPattern } }),
});
