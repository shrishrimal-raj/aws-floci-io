import { describe, expect, it } from "vitest";
import { buildEksIrsaComplianceExample } from "../src/examples/eks-irsa-compliance.example.js";
import { buildEventDrivenOperationsExample } from "../src/examples/event-driven-operations.example.js";
import { buildSecureOrdersServiceExample } from "../src/examples/secure-ecs-platform.example.js";
import {
  auditEvent,
  backoffDelayMs,
  complianceFindings,
  containerDeploymentEvent,
  containerPlatformDrRunbook,
  ecrLifecyclePolicy,
  ecsServiceDashboardBody,
  estimateFargateMonthlyCost,
  retryWithBackoff,
} from "../src/enterprise-patterns.js";

describe("enterprise container platform patterns", () => {
  it("builds audit events, lifecycle policy, deployment event, dashboard, cost, DR, and compliance", () => {
    const audit = auditEvent({ action: "ecs.deploy", resource: "orders", result: "ALLOW", context: { tenantId: "retail", actorId: "bot", requestId: "req-1" } }, new Date("2024-06-01T00:00:00Z"));
    expect(audit.timestamp).toBe("2024-06-01T00:00:00.000Z");
    expect(JSON.parse(ecrLifecyclePolicy(7, 10)).rules).toHaveLength(2);
    expect(containerDeploymentEvent({ serviceName: "orders", imageUri: "image", environment: "prod", version: "v1", actorId: "bot" }).DetailType).toBe("ContainerDeploymentRequested");
    expect(ecsServiceDashboardBody("us-east-1", [{ clusterName: "prod", serviceName: "orders", targetCpuPercent: 60 }])).toContain("CPUUtilization");
    expect(estimateFargateMonthlyCost({ taskCount: 2, cpuUnits: 512, memoryMb: 1024 })).toBeGreaterThan(0);
    expect(containerPlatformDrRunbook("us-east-1", "us-west-2")).toHaveLength(5);
    expect(complianceFindings({ privateSubnets: ["a", "b"], scanOnPush: true, desiredCount: 2, tags: { CostCenter: "cc", Owner: "team" } }).every((finding) => finding.status === "PASS")).toBe(true);
  });

  it("retries throttled operations with backoff", async () => {
    let attempts = 0;
    const sleeps: number[] = [];
    const result = await retryWithBackoff(
      async () => {
        attempts += 1;
        if (attempts === 1) {
          const error = new Error("try again");
          error.name = "ThrottlingException";
          throw error;
        }
        return "ok";
      },
      { maxAttempts: 2, baseDelayMs: 100, maxDelayMs: 1_000, retryableErrors: ["ThrottlingException"] },
      async (ms) => {
        sleeps.push(ms);
      }
    );
    expect(result).toBe("ok");
    expect(sleeps).toEqual([backoffDelayMs(1, { maxAttempts: 2, baseDelayMs: 100, maxDelayMs: 1_000 })]);
  });

  it("keeps real-world examples executable and detailed", async () => {
    const secureOrders = buildSecureOrdersServiceExample();
    const operations = await buildEventDrivenOperationsExample();
    const eks = buildEksIrsaComplianceExample();
    expect(secureOrders.compliance.map((finding) => finding.control)).toContain("cost-allocation");
    expect(operations.drRunbook[3]?.action).toContain("Route53");
    expect(JSON.stringify(eks.trustPolicy)).toContain("system:serviceaccount:retail:catalog");
  });
});
