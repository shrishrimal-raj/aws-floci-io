#!/usr/bin/env tsx
import {
  createQueue,
  deleteMessage,
  deleteQueue,
  receiveMessages,
  sendMessage,
} from "../use-cases/queues.js";

const queueUrl = await createQueue({
  name: `floci-sqs-eventbridge-target-${Date.now()}`,
  receiveWaitTimeSeconds: 10,
});

const eventBridgeLikePayload = {
  source: "billing.invoice",
  "detail-type": "InvoiceFinalized",
  detail: {
    tenantId: "acme-saas",
    invoiceId: "inv-2026-001",
    amountCents: 49900,
  },
};

await sendMessage({
  queueUrl,
  body: JSON.stringify(eventBridgeLikePayload),
  attributes: {
    source: { DataType: "String", StringValue: eventBridgeLikePayload.source },
    detailType: {
      DataType: "String",
      StringValue: eventBridgeLikePayload["detail-type"],
    },
  },
});

const [message] = await receiveMessages(queueUrl, 1, 1);
console.log({
  integration:
    "EventBridge rule or SNS subscription can target SQS to decouple invoice email/search/accounting workers",
  messageBody: message?.body,
  attributes: message?.attributes,
});

if (message?.receiptHandle)
  await deleteMessage(queueUrl, message.receiptHandle);
await deleteQueue(queueUrl);
