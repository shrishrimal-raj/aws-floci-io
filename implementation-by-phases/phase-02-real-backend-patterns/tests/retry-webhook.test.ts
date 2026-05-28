import { describe, expect, it } from "vitest";
import { computeBackoffMs, isPoisonMessage, shouldRetry } from "../src/retry.js";
import { deliverWebhook, signWebhook, verifyWebhook, type WebhookDelivery } from "../src/webhook.js";

const delivery: WebhookDelivery = {
  tenantId: "tenant-a",
  endpointId: "endpoint-a",
  url: "https://example.com/webhook",
  secret: "top-secret",
  eventId: "evt_123",
  payload: { ok: true },
  attempt: 2,
};

describe("retry and webhook delivery", () => {
  it("computes exponential backoff with jitter", () => {
    expect(computeBackoffMs(3, { maxAttempts: 5, baseDelayMs: 100, maxDelayMs: 1000, jitterRatio: 0.1 }, () => 0)).toBe(400);
    expect(shouldRetry(429)).toBe(true);
    expect(shouldRetry(400)).toBe(false);
    expect(isPoisonMessage(8)).toBe(true);
  });

  it("signs and verifies HMAC webhook payloads", () => {
    const body = JSON.stringify(delivery.payload);
    const signature = signWebhook(delivery.secret, body, 123);
    expect(verifyWebhook(delivery.secret, body, signature)).toBe(true);
    expect(verifyWebhook("wrong", body, signature)).toBe(false);
  });

  it("classifies retryable delivery failures", async () => {
    const result = await deliverWebhook(delivery, async () => new Response("busy", { status: 503 }));
    expect(result.status).toBe("retry");
    expect(result.nextDelayMs).toBeGreaterThan(0);
  });
});
