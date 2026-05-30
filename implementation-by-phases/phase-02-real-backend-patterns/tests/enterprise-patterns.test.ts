import { describe, expect, it } from "vitest";
import { assertEndpointAccess, deliveryMetricDimensions, redactWebhookDelivery, webhookAuditEvent, webhookRetentionDecision } from "../src/enterprise-patterns.js";
import type { WebhookDelivery } from "../src/webhook.js";

const delivery: WebhookDelivery = {
  tenantId: "tenant-a",
  endpointId: "endpoint-a",
  url: "https://example.com/webhook",
  secret: "top-secret",
  eventId: "evt-123",
  payload: { pii: "hidden" },
  attempt: 1,
};

describe("enterprise webhook patterns", () => {
  it("enforces tenant endpoint access", () => {
    expect(() => assertEndpointAccess({ tenantId: "tenant-a", endpointId: "endpoint-a", enabled: true, allowedEventTypes: ["invoice.paid"] }, delivery, "invoice.paid")).not.toThrow();
    expect(() => assertEndpointAccess({ tenantId: "tenant-b", endpointId: "endpoint-a", enabled: true, allowedEventTypes: ["invoice.paid"] }, delivery, "invoice.paid")).toThrow("Endpoint tenant mismatch");
  });

  it("creates audit and metric-safe payloads", () => {
    expect(webhookAuditEvent(delivery, "Webhook.Accept", "accepted", undefined, new Date("2026-01-01T00:00:00.000Z"))).toMatchObject({ eventId: "evt-123", occurredAt: "2026-01-01T00:00:00.000Z" });
    expect(redactWebhookDelivery(delivery)).toMatchObject({ secret: "[REDACTED]", payload: "[REDACTED]" });
    expect(deliveryMetricDimensions(delivery, { status: "retry", statusCode: 503, signature: "sig" })).toEqual({ TenantId: "tenant-a", EndpointId: "endpoint-a", Result: "retry", StatusCode: "503" });
  });

  it("classifies retention lifecycle", () => {
    const now = new Date("2026-05-30T00:00:00.000Z");
    expect(webhookRetentionDecision("2026-05-20T00:00:00.000Z", { hotDays: 30, archiveDays: 365 }, now)).toBe("hot");
    expect(webhookRetentionDecision("2026-01-01T00:00:00.000Z", { hotDays: 30, archiveDays: 365 }, now)).toBe("archive");
    expect(webhookRetentionDecision("2024-01-01T00:00:00.000Z", { hotDays: 30, archiveDays: 365 }, now)).toBe("delete");
  });
});
