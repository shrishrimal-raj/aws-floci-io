import { describe, expect, it, vi } from "vitest";
import { createDomainEvent } from "../src/domain-events.js";
import {
  buildAuditLogEntry,
  buildDisasterRecoveryPlan,
  buildLifecyclePolicy,
  complianceTags,
  estimateKinesisShards,
  observabilityEnvelope,
  secureEventAccessPolicy,
  withEnterpriseRetry,
} from "../src/enterprise-patterns.js";
import { clickstreamAnalyticsExample, marketplaceOrderLifecycleExample, regulatedEventsGovernanceExample, sampleClickEvents } from "../src/enterprise-use-cases.js";

describe("enterprise event patterns", () => {
  it("retries transient operations with exponential policy", async () => {
    const operation = vi.fn().mockRejectedValueOnce(Object.assign(new Error("throttle"), { name: "ThrottlingException" })).mockResolvedValue("ok");
    await expect(withEnterpriseRetry(operation, { maxAttempts: 2, baseDelayMs: 1, backoffRate: 2, retryableErrors: ["ThrottlingException"] })).resolves.toBe("ok");
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it("builds audit, observability, access, lifecycle, tags, capacity, and DR plans", () => {
    const event = createDomainEvent({ source: "commerce.order", type: "OrderPlaced", tenantId: "tenant-a", subject: "order-1", detail: { total: 42 } });
    expect(buildAuditLogEntry({ eventId: event.id, tenantId: event.tenantId, actor: "svc", action: "publish", resource: "order-1", outcome: "ALLOW", correlationId: event.id }).at).toBeTruthy();
    expect(observabilityEnvelope(event, "orders").dimensions).toMatchObject({ tenantId: "tenant-a", service: "orders" });
    expect(secureEventAccessPolicy({ tenantId: "tenant-a", principalArn: "arn:principal", eventBusArn: "arn:bus", allowedSources: ["commerce.order"] })).toMatchObject({ Version: "2012-10-17" });
    expect(buildLifecyclePolicy(true).purgeAfterDays).toBeGreaterThan(365);
    expect(complianceTags({ dataClassification: "restricted", retentionClass: "regulated", pii: true, owner: "platform", costCenter: "cc1" })).toMatchObject({ ContainsPII: "true" });
    expect(estimateKinesisShards(2500, 600)).toBe(3);
    expect(buildDisasterRecoveryPlan("commerce-events", "prod").eventBusArchiveName).toContain("commerce-events-prod");
  });

  it("documents enterprise use cases with concrete function coverage", () => {
    expect(marketplaceOrderLifecycleExample().functions).toContain("createDomainEvent");
    expect(clickstreamAnalyticsExample(sampleClickEvents()).example.recommendedShards).toBeGreaterThan(0);
    expect(regulatedEventsGovernanceExample().functions).toContain("secureEventAccessPolicy");
  });
});
