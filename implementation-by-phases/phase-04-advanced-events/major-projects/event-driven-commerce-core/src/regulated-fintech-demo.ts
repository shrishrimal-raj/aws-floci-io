#!/usr/bin/env tsx
import {
  buildAuditLogEntry,
  buildDisasterRecoveryPlan,
  buildLifecyclePolicy,
  complianceTags,
  createDomainEvent,
  observabilityEnvelope,
  secureEventAccessPolicy,
  withEnterpriseRetry,
} from "../../../src/index.js";

const paymentEvent = createDomainEvent({
  source: "commerce.checkout",
  type: "PaymentAuthorized",
  tenantId: "bank-partner-a",
  subject: "payment-9001",
  detail: { paymentId: "payment-9001", amountCents: 250000, currency: "USD", riskScore: 12 },
});

const audit = buildAuditLogEntry({
  eventId: paymentEvent.id,
  tenantId: paymentEvent.tenantId,
  actor: "payments-service",
  action: "AuthorizePayment",
  resource: paymentEvent.subject,
  outcome: "ALLOW",
  correlationId: paymentEvent.id,
  metadata: { mfa: true, policy: "pci-dss" },
});

const retryResult = await withEnterpriseRetry(async () => "payment-event-published", { maxAttempts: 3, baseDelayMs: 5, backoffRate: 2 });

console.log("Regulated fintech event controls");
console.log(
  JSON.stringify(
    {
      event: paymentEvent,
      retryResult,
      audit,
      observability: observabilityEnvelope(paymentEvent, "payments-service", { authorized: 1, latencyMs: 31 }),
      access: secureEventAccessPolicy({
        tenantId: paymentEvent.tenantId,
        principalArn: "arn:aws:iam::123456789012:role/bank-partner-a-publisher",
        eventBusArn: "arn:aws:events:us-east-1:123456789012:event-bus/regulated-payments",
        allowedSources: ["commerce.checkout"],
      }),
      lifecycle: buildLifecyclePolicy(true),
      tags: complianceTags({ dataClassification: "restricted", retentionClass: "regulated", pii: true, owner: "security-platform", costCenter: "fin-ops-700" }),
      disasterRecovery: buildDisasterRecoveryPlan("regulated-payments", "prod"),
    },
    null,
    2
  )
);
