import { SendMessageCommand } from "@aws-sdk/client-sqs";
import { createClient } from "@floci-lab/aws-clients";
import { buildArn, createAuditEvent, withRetry } from "../index.js";

/**
 * Real-world scenario: order service publishes an event to SQS and emits an audit log record.
 * Pattern covered: event-driven processing, retries, trace metadata, secure audit trail.
 */
export async function eventDrivenProcessingExample(queueUrl: string) {
  const sqs = createClient("sqs", { endpoint: "http://localhost:4566", region: "us-east-1" });
  const traceId = "trace-order-10001";
  const body = JSON.stringify({ orderId: "ord-10001", eventType: "OrderAccepted", traceId });

  const sendResult = await withRetry(() =>
    sqs.send(
      new SendMessageCommand({
        QueueUrl: queueUrl,
        MessageBody: body,
        MessageAttributes: {
          traceId: { DataType: "String", StringValue: traceId },
          eventType: { DataType: "String", StringValue: "OrderAccepted" },
        },
      })
    )
  );

  const audit = createAuditEvent({
    actor: "orders-api",
    action: "sqs.message.publish",
    resourceArn: buildArn({
      partition: "aws",
      service: "sqs",
      region: "us-east-1",
      accountId: "123456789012",
      resource: "orders-events",
    }),
    result: "success",
    metadata: { traceId, messageId: sendResult.MessageId ?? "unknown" },
  });

  return { messageId: sendResult.MessageId, audit };
}
