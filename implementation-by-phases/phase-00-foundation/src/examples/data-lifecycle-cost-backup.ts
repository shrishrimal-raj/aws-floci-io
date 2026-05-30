import { availabilityZone, buildEnterpriseTags, lifecyclePlanFor } from "../index.js";

/**
 * Real-world scenario: architecture review for order data storage before implementation.
 * Pattern covered: data lifecycle, backup/DR, cost controls, compliance notes, multi-AZ placement.
 */
export function dataLifecycleCostBackupExample() {
  const context = {
    application: "orders-platform",
    environment: "prod" as const,
    owner: "data-engineering",
    costCenter: "cc-2002",
    dataClassification: "restricted" as const,
  };

  return {
    primaryAz: availabilityZone("us-east-1", "a"),
    failoverAz: availabilityZone("us-east-1", "b"),
    tags: buildEnterpriseTags(context, { RetentionOwner: "records-management" }),
    resources: {
      ordersArchiveBucket: lifecyclePlanFor("s3", context.environment),
      ordersTable: lifecyclePlanFor("dynamodb", context.environment),
      orderEventsQueue: lifecyclePlanFor("sqs", context.environment),
    },
  };
}
