import { describe, expect, it } from "vitest";
import { EcsAutoScaler, ecsResourceId } from "../src/autoscaling.js";
import { createInfraClients } from "../src/infra-clients.js";

class FakeClient {
  commands: unknown[] = [];
  async send(command: unknown) { this.commands.push(command); return {}; }
}

describe("Auto Scaling and infra clients", () => {
  it("creates Phase 06 AWS clients", () => {
    const clients = createInfraClients({ endpoint: "http://localhost:4566" });
    expect(clients.ecr.constructor.name).toBe("ECRClient");
    expect(clients.ecs.constructor.name).toBe("ECSClient");
    expect(clients.ec2.constructor.name).toBe("EC2Client");
    expect(clients.eks.constructor.name).toBe("EKSClient");
    expect(clients.cloudFormation.constructor.name).toBe("CloudFormationClient");
    expect(clients.elbv2.constructor.name).toBe("ElasticLoadBalancingV2Client");
    expect(clients.autoScaling.constructor.name).toBe("ApplicationAutoScalingClient");
    expect(clients.route53.constructor.name).toBe("Route53Client");
  });

  it("registers ECS scalable target and target tracking policy", async () => {
    const client = new FakeClient();
    const scaler = new EcsAutoScaler(client as never);
    const plan = { clusterName: "prod", serviceName: "orders", minCapacity: 2, maxCapacity: 10, targetCpuPercent: 60 };
    expect(ecsResourceId("prod", "orders")).toBe("service/prod/orders");
    await scaler.register(plan);
    await scaler.putCpuPolicy(plan);
    expect(client.commands.map((command) => command?.constructor.name)).toEqual(["RegisterScalableTargetCommand", "PutScalingPolicyCommand"]);
  });
});
