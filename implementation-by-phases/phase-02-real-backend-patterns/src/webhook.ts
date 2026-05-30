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
  errorMessage?: string;
}

/**
 * Signs webhook body with Stripe-style timestamped HMAC header.
 *
 * Example: receiver verifies `x-webhook-signature` before trusting tenant billing or order events.
 */
export function signWebhook(secret: string, body: string, timestamp = Math.floor(Date.now() / 1000)): string {
  const signedPayload = `${timestamp}.${body}`;
  const digest = crypto.createHmac("sha256", secret).update(signedPayload).digest("hex");
  return `t=${timestamp},v1=${digest}`;
}

/**
 * Verifies webhook signature with constant-time digest comparison.
 *
 * Example: partner endpoint rejects tampered body or wrong secret before writing event to its database.
 */
export function verifyWebhook(secret: string, body: string, signature: string): boolean {
  const timestamp = signature.match(/t=(\d+)/)?.[1];
  const actual = signature.match(/v1=([a-f0-9]+)/)?.[1];
  if (!timestamp || !actual) return false;
  const expected = signWebhook(secret, body, Number(timestamp)).match(/v1=([a-f0-9]+)/)?.[1];
  if (!expected || expected.length !== actual.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(actual));
}

/**
 * Delivers signed webhook and classifies result for success, retry, DLQ, or terminal failure.
 *
 * Example: worker posts to customer endpoint, retries `503`, sends `400` to failed audit state, and moves exhausted attempts to DLQ.
 */
export async function deliverWebhook(
  delivery: WebhookDelivery,
  fetcher: typeof fetch = fetch,
  policy: RetryPolicy = defaultRetryPolicy
): Promise<DeliveryResult> {
  const body = JSON.stringify(delivery.payload);
  const signature = signWebhook(delivery.secret, body);
  try {
    const response = await fetcher(delivery.url, {
      method: "POST",
      headers: { "content-type": "application/json", "x-webhook-signature": signature, "x-event-id": delivery.eventId },
      body,
    });

    if (response.ok) return { status: "delivered", statusCode: response.status, signature };
    if (!shouldRetry(response.status)) return { status: "failed", statusCode: response.status, signature };
    if (isPoisonMessage(delivery.attempt, policy)) return { status: "dlq", statusCode: response.status, signature };
    return { status: "retry", statusCode: response.status, nextDelayMs: computeBackoffMs(delivery.attempt, policy), signature };
  } catch (error) {
    if (isPoisonMessage(delivery.attempt, policy)) {
      return { status: "dlq", signature, errorMessage: error instanceof Error ? error.message : "unknown network error" };
    }
    return {
      status: "retry",
      nextDelayMs: computeBackoffMs(delivery.attempt, policy),
      signature,
      errorMessage: error instanceof Error ? error.message : "unknown network error",
    };
  }
}

export class WebhookReplayQueue {
  constructor(private readonly sqs: SQSClient, private readonly queueUrl = process.env.WEBHOOK_REPLAY_QUEUE_URL ?? "") {}

  /**
   * Enqueues failed delivery for delayed SQS replay.
   *
   * Example: after `deliverWebhook` returns `retry`, enqueue attempt+1 so worker retries later without blocking current batch.
   */
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
