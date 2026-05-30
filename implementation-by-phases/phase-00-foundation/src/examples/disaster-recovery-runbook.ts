import { availabilityZone, lifecyclePlanFor, observabilityPlanFor } from "../index.js";

/**
 * Real-world scenario: regulated workload documents a foundation-level recovery runbook.
 * Pattern covered: backup, disaster recovery, multi-AZ intent, monitoring signals, cost-aware recovery choices.
 */
export function disasterRecoveryRunbookExample() {
  const dataServices = ["s3", "dynamodb", "sqs"] as const;

  return {
    recoveryObjective: {
      rpoMinutes: 15,
      rtoMinutes: 60,
      primaryAz: availabilityZone("us-east-1", "a"),
      failoverAz: availabilityZone("us-east-1", "b"),
    },
    lifecycle: dataServices.map((service) => lifecyclePlanFor(service, "prod")),
    observability: observabilityPlanFor([...dataServices]),
    runbookSteps: [
      "Confirm Floci or AWS endpoint health before failover.",
      "Validate S3 backup replication status and block public access.",
      "Restore DynamoDB table from point-in-time backup when data corruption is confirmed.",
      "Redrive SQS dead-letter messages after consumers are healthy.",
      "Review cost impact after recovery and remove temporary duplicate resources.",
    ],
  };
}
