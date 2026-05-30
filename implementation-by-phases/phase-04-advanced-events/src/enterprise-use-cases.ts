import { checkoutStateMachineDefinition, countStates } from "./checkout-workflow.js";
import { createDomainEvent, eventPatternForTypes, type CommerceEventType, type DomainEvent } from "./domain-events.js";
import {
  buildAuditLogEntry,
  buildDisasterRecoveryPlan,
  buildLifecyclePolicy,
  complianceTags,
  estimateKinesisShards,
  observabilityEnvelope,
  secureEventAccessPolicy,
} from "./enterprise-patterns.js";
import { detectHotPartition, partitionKeyForClick, type ClickEvent } from "./streams.js";

export interface EnterpriseUseCaseSummary {
  name: string;
  description: string;
  functions: string[];
  example: Record<string, unknown>;
}

/**
 * Example: marketplace order lifecycle using EventBridge choreography.
 * Shows domain-event creation, rule matching, audit record, and observability envelope.
 */
export function marketplaceOrderLifecycleExample(): EnterpriseUseCaseSummary {
  const orderPlaced = createDomainEvent({
    source: "commerce.order",
    type: "OrderPlaced",
    tenantId: "marketplace-us",
    subject: "order-1001",
    detail: { orderId: "order-1001", totalCents: 12999, currency: "USD", sellerCount: 3 },
  });

  return {
    name: "Marketplace order lifecycle",
    description: "EventBridge publishes OrderPlaced; fulfillment, notification, analytics, and billing consume independently.",
    functions: ["createDomainEvent", "eventPatternForTypes", "buildAuditLogEntry", "observabilityEnvelope"],
    example: {
      event: orderPlaced,
      rulePattern: eventPatternForTypes(["OrderPlaced"]),
      audit: buildAuditLogEntry({
        eventId: orderPlaced.id,
        tenantId: orderPlaced.tenantId,
        actor: "checkout-service",
        action: "events:PutEvents",
        resource: orderPlaced.subject,
        outcome: "ALLOW",
        correlationId: orderPlaced.id,
      }),
      observability: observabilityEnvelope(orderPlaced, "checkout-service", { latencyMs: 42, published: 1 }),
    },
  };
}

/**
 * Example: checkout orchestration using Step Functions saga pattern.
 * Shows ordered workflow, retries, compensation, and state-count validation.
 */
export function checkoutSagaExample(): EnterpriseUseCaseSummary {
  const definition = checkoutStateMachineDefinition();
  return {
    name: "Checkout saga orchestration",
    description: "Step Functions reserves inventory, authorizes payment, places order, and compensates failures.",
    functions: ["checkoutStateMachineDefinition", "countStates", "CheckoutWorkflow.start"],
    example: { stateCount: countStates(definition), compensationState: "ReleaseInventory", definition },
  };
}

/**
 * Example: tenant clickstream planning for Kinesis and Firehose.
 * Shows partition-key choice, hot-partition detection, and shard sizing.
 */
export function clickstreamAnalyticsExample(events: ClickEvent[]): EnterpriseUseCaseSummary {
  const keys = events.map(partitionKeyForClick);
  return {
    name: "Tenant clickstream analytics",
    description: "Kinesis ingests click events, Firehose lands immutable raw events to S3 for lake analytics.",
    functions: ["partitionKeyForClick", "detectHotPartition", "estimateKinesisShards", "ClickStream.put", "FirehoseSink.put"],
    example: { partitionKeys: keys, hotPartition: detectHotPartition(keys), recommendedShards: estimateKinesisShards(2500, 600) },
  };
}

/**
 * Example: regulated event retention, access, and disaster recovery.
 * Shows compliance tags, lifecycle, scoped IAM policy, and DR plan.
 */
export function regulatedEventsGovernanceExample(): EnterpriseUseCaseSummary {
  return {
    name: "Regulated events governance",
    description: "Healthcare/fintech events need tenant-scoped access, retention, replay, and recovery controls.",
    functions: ["secureEventAccessPolicy", "buildLifecyclePolicy", "complianceTags", "buildDisasterRecoveryPlan"],
    example: {
      accessPolicy: secureEventAccessPolicy({
        tenantId: "hospital-a",
        principalArn: "arn:aws:iam::123456789012:role/hospital-a-publisher",
        eventBusArn: "arn:aws:events:us-east-1:123456789012:event-bus/commerce-regulated",
        allowedSources: ["commerce.checkout", "commerce.order"],
      }),
      lifecycle: buildLifecyclePolicy(true),
      tags: complianceTags({ dataClassification: "restricted", retentionClass: "regulated", pii: true, owner: "platform", costCenter: "cc-4100" }),
      disasterRecovery: buildDisasterRecoveryPlan("commerce-events", "prod"),
    },
  };
}

/**
 * Example: rule catalog for enterprise teams.
 * Shows how teams publish standard event-pattern snippets for reuse in IaC.
 */
export function eventRuleCatalog(types: CommerceEventType[]): Record<string, unknown> {
  return {
    pattern: eventPatternForTypes(types),
    contract: {
      requiredFields: ["id", "type", "source", "tenantId", "subject", "version", "time", "detail"],
      idempotencyKey: "id",
      schemaVersionField: "version",
    },
  };
}

/**
 * Example fixture: realistic clickstream samples for demos/tests.
 */
export function sampleClickEvents(): ClickEvent[] {
  return [
    { tenantId: "tenant-a", sessionId: "s-100", userId: "u-1", path: "/", at: "2026-05-30T10:00:00.000Z" },
    { tenantId: "tenant-a", sessionId: "s-100", userId: "u-1", path: "/cart", at: "2026-05-30T10:00:08.000Z" },
    { tenantId: "tenant-b", sessionId: "s-210", path: "/pricing", at: "2026-05-30T10:00:11.000Z" },
  ];
}

/**
 * Example fixture: event used by enterprise documentation snippets.
 */
export function sampleCheckoutEvent(): DomainEvent<{ cartId: string; amountCents: number }> {
  return createDomainEvent({
    source: "commerce.checkout",
    type: "CheckoutStarted",
    tenantId: "tenant-a",
    subject: "cart-100",
    detail: { cartId: "cart-100", amountCents: 4999 },
  });
}
