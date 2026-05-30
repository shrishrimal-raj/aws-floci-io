import { complianceControlsFor, observabilityPlanFor, summarizeReadiness, type SmokeResult } from "../index.js";

/**
 * Real-world scenario: platform team converts smoke-test output into monitoring and compliance evidence.
 * Pattern covered: observability, alarms, dashboards, compliance controls, operator recommendations.
 */
export function monitoringObservabilityComplianceExample(results: SmokeResult[]) {
  const services = ["floci", "s3", "sqs", "dynamodb"] as const;
  const readiness = summarizeReadiness(results);

  return {
    readiness,
    observability: observabilityPlanFor([...services]),
    complianceEvidence: complianceControlsFor([...services]),
    operatorMessage: readiness.passed
      ? "Local platform baseline is healthy. Run service integration tests next."
      : `Repair foundation dependencies before continuing: ${readiness.failedServices.join(", ")}`,
  };
}
