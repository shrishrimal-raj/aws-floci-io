#!/usr/bin/env tsx
import {
  createTopic,
  deleteTopic,
  publishJsonEvent,
  subscribe,
  topicMessageAttributes,
  unsubscribe,
} from "../use-cases/topics.js";

const topicArn = await createTopic({
  name: `floci-sns-integration-${Date.now()}`,
  displayName: "integration-events",
});

const sqsSubscriptionArn = await subscribe({
  topicArn,
  protocol: "sqs",
  endpoint: "arn:aws:sqs:us-east-1:000000000000:integration-sink",
  filterPolicy: { eventType: ["invoice.finalized", "invoice.paid"] },
  rawMessageDelivery: true,
});

const lambdaSubscriptionArn = await subscribe({
  topicArn,
  protocol: "lambda",
  endpoint: "arn:aws:lambda:us-east-1:000000000000:function:invoice-projector",
  filterPolicy: { eventType: ["invoice.finalized"] },
});

const httpsSubscriptionArn = await subscribe({
  topicArn,
  protocol: "https",
  endpoint: "https://hooks.example.com/accounting/events",
  filterPolicy: { tenantId: ["acme-saas"] },
});

const messageId = await publishJsonEvent(
  topicArn,
  "invoice.finalized",
  {
    tenantId: "acme-saas",
    invoiceId: "inv-2026-0001",
    totalCents: 49900,
    currency: "USD",
  },
  "trace-invoice-0001",
);

console.log({
  messageId,
  integrationPattern:
    "single SNS publish fanouts to SQS workers, Lambda projections, and HTTPS accounting webhook",
  attributes: topicMessageAttributes({
    eventType: "invoice.finalized",
    tenantId: "acme-saas",
    traceId: "trace-invoice-0001",
  }),
  resourceLifecycle: "topic and subscriptions are deleted at end of example",
});

await unsubscribe(sqsSubscriptionArn);
await unsubscribe(lambdaSubscriptionArn);
await unsubscribe(httpsSubscriptionArn);
await deleteTopic(topicArn);
