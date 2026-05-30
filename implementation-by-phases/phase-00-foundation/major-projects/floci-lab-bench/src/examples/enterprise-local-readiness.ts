import { allPassed, renderStatusBoard, runFlociSmokeTests } from "../../../../src/index.js";
import { createAuditEvent, lifecyclePlanFor, observabilityPlanFor, summarizeReadiness } from "../../../../src/enterprise-patterns.js";

/**
 * Real-world scenario: developer workstation readiness gate before service teams start local testing.
 * Pattern covered: smoke-test orchestration, audit logging, lifecycle awareness, fail-fast pipeline output.
 */
export async function enterpriseLocalReadinessExample() {
  const results = await runFlociSmokeTests();
  const passed = allPassed(results);
  const readiness = summarizeReadiness(results);

  const audit = createAuditEvent({
    actor: "developer-workstation",
    action: "floci.readiness.check",
    resourceArn: "arn:aws:sqs:us-east-1:123456789012:phase-00-readiness",
    result: passed ? "success" : "failure",
    metadata: {
      serviceCount: results.length,
      failedCount: results.filter((result) => result.status === "fail").length,
    },
  });

  return {
    passed,
    statusBoard: renderStatusBoard(results),
    audit,
    readiness,
    recommendedQueueLifecycle: lifecyclePlanFor("sqs", "dev"),
    localObservability: observabilityPlanFor(["floci", "s3", "sqs", "dynamodb"]),
  };
}
