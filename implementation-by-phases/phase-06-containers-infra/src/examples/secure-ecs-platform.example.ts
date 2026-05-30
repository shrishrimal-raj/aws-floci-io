import {
  auditEvent,
  complianceFindings,
  dockerBuildPushCommands,
  ecrLifecyclePolicy,
  ecsServiceInput,
  estimateFargateMonthlyCost,
  platformServices,
  taskDefinitionInput,
  targetGroupName,
  weightedAliasRecord,
} from "../index.js";

const orders = platformServices.find((service) => service.name === "orders")!;

/**
 * Enterprise ECS service example: secure image flow, task definition, private
 * networking, blue/green traffic shift, compliance evidence, and cost estimate.
 */
export function buildSecureOrdersServiceExample() {
  const image = "123456789012.dkr.ecr.us-east-1.amazonaws.com/orders:v2024.06.01";
  const taskDefinition = taskDefinitionInput({ ...orders, image, environment: { NODE_ENV: "production", OTEL_SERVICE_NAME: "orders" } }, "arn:aws:iam::123456789012:role/ecsExec", "arn:aws:iam::123456789012:role/ordersTask");
  const service = ecsServiceInput(orders, "arn:aws:ecs:us-east-1:123456789012:cluster/prod", "orders-task:42", "arn:aws:elasticloadbalancing:tg/orders-blue", ["subnet-private-a", "subnet-private-b"], ["sg-orders"]);

  return {
    imageBuild: dockerBuildPushCommands({ accountId: "123456789012", region: "us-east-1", repository: "orders", tag: "v2024.06.01" }),
    ecrLifecyclePolicy: ecrLifecyclePolicy(7, 50),
    taskDefinition,
    service,
    blueTargetGroupName: targetGroupName("orders", "blue"),
    canaryShift: weightedAliasRecord("api.example.com", "ZROOT", "blue-alb.example.com", "ZBLUE", "green-alb.example.com", "ZGREEN", 10),
    monthlyCostUsd: estimateFargateMonthlyCost({ taskCount: orders.desiredCount, cpuUnits: orders.cpu, memoryMb: orders.memory }),
    compliance: complianceFindings({ privateSubnets: ["subnet-private-a", "subnet-private-b"], scanOnPush: true, desiredCount: orders.desiredCount, tags: { CostCenter: "retail-platform", Owner: "orders-team" } }),
    audit: auditEvent(
      {
        action: "ecs.service.deploy",
        resource: "orders",
        result: "ALLOW",
        context: { tenantId: "retail", actorId: "release-bot", requestId: "req-20240601" },
        metadata: { image, changeTicket: "CHG-1042" },
      },
      new Date("2024-06-01T12:00:00Z")
    ),
  };
}
