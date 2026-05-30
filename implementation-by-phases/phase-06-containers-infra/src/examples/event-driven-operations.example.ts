import { backoffDelayMs, containerDeploymentEvent, containerPlatformDrRunbook, ecsServiceDashboardBody, retryWithBackoff } from "../index.js";

/**
 * Enterprise operations example: event-driven deployment notifications,
 * deterministic retry policy, dashboards, and disaster-recovery runbook.
 */
export async function buildEventDrivenOperationsExample() {
  let calls = 0;
  const result = await retryWithBackoff(
    async () => {
      calls += 1;
      if (calls < 2) {
        const error = new Error("throttled");
        error.name = "ThrottlingException";
        throw error;
      }
      return "deployment accepted";
    },
    { maxAttempts: 3, baseDelayMs: 100, maxDelayMs: 1_000, retryableErrors: ["ThrottlingException"] }
  );

  return {
    result,
    retryScheduleMs: [backoffDelayMs(1, { maxAttempts: 3, baseDelayMs: 100, maxDelayMs: 1_000 }), backoffDelayMs(2, { maxAttempts: 3, baseDelayMs: 100, maxDelayMs: 1_000 })],
    deploymentEvent: containerDeploymentEvent({ serviceName: "payments", imageUri: "123456789012.dkr.ecr.us-east-1.amazonaws.com/payments:v42", environment: "prod", version: "v42", actorId: "release-bot" }),
    dashboardBody: ecsServiceDashboardBody("us-east-1", [
      { clusterName: "prod", serviceName: "auth", targetCpuPercent: 55 },
      { clusterName: "prod", serviceName: "payments", targetCpuPercent: 60 },
    ]),
    drRunbook: containerPlatformDrRunbook("us-east-1", "us-west-2"),
  };
}
