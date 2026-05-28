import crypto from "node:crypto";
import { SendMessageCommand, type SQSClient } from "@aws-sdk/client-sqs";
import { computeBackoffMs, defaultRetryPolicy, isPoisonMessage, shouldRetry, type RetryPolicy } from "./retry.js";

export interface WebhookDelivery {
  tenantId: string;
  endpointId: string;
  url: string;
  secret: string;
  eventId: string;
  payload: unknown;
  attempt: number;
}

export interface DeliveryResult {
  status: "delivered" | "retry" | "dlq" | "failed";
  statusCode?: number;
  nextDelayMs?: number;
  signature: string;
}

export function signWebhook(secret: string, body: string, timestamp = Math.floor(Date.now() / 1000)): string {
  const signedPayload = `${timestamp}.${body}`;
  const digest = crypto.createHmac("sha256", secret).update(signedPayload).digest("hex");
  return `t=${timestamp},v1=${digest}`;
}

export function verifyWebhook(secret: string, body: string, signature: string): boolean {
  const timestamp = signature.match(/t=(\d+)/)?.[1];
  const actual = signature.match(/v1=([a-f0-9]+)/)?.[1];
  if (!timestamp || !actual) return false;
  const expected = signWebhook(secret, body, Number(timestamp)).match(/v1=([a-f0-9]+)/)?.[1];
  return !!expected && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(actual));
}

export async function deliverWebhook(
  delivery: WebhookDelivery,
  fetcher: typeof fetch = fetch,
  policy: RetryPolicy = defaultRetryPolicy
): Promise<DeliveryResult> {
  const body = JSON.stringify(delivery.payload);
  const signature = signWebhook(delivery.secret, body);
  const response = await fetcher(delivery.url, {
    method: "POST",
    headers: { "content-type": "application/json", "x-webhook-signature": signature, "x-event-id": delivery.eventId },
    body,
  });

  if (response.ok) return { status: "delivered", statusCode: response.status, signature };
  if (!shouldRetry(response.status)) return { status: "failed", statusCode: response.status, signature };
  if (isPoisonMessage(delivery.attempt, policy)) return { status: "dlq", statusCode: response.status, signature };
  return { status: "retry", statusCode: response.status, nextDelayMs: computeBackoffMs(delivery.attempt, policy), signature };
}

export class WebhookReplayQueue {
  constructor(private readonly sqs: SQSClient, private readonly queueUrl = process.env.WEBHOOK_REPLAY_QUEUE_URL ?? "") {}

  async enqueue(delivery: WebhookDelivery): Promise<void> {
    await this.sqs.send(
      new SendMessageCommand({
        QueueUrl: this.queueUrl,
        MessageBody: JSON.stringify(delivery),
        DelaySeconds: Math.min(900, Math.ceil(computeBackoffMs(delivery.attempt) / 1000)),
        MessageAttributes: {
          tenantId: { DataType: "String", StringValue: delivery.tenantId },
          endpointId: { DataType: "String", StringValue: delivery.endpointId },
        },
      })
    );
  }
}
