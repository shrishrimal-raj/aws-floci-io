import { describe, expect, it } from "vitest";
import { ecsServiceInput, platformServices, taskDefinitionInput } from "../src/ecs-platform.js";
import { chooseLoadBalancer, targetGroupName, weightedAliasRecord } from "../src/load-balancing.js";

describe("ECS Fargate + ALB platform", () => {
  it("defines four core microservices", () => {
    expect(platformServices.map((service) => service.name)).toEqual(["auth", "catalog", "orders", "payments"]);
  });

  it("builds Fargate task definition with matching health check port", () => {
    const service = platformServices[0]!;
    const input = taskDefinitionInput(service, "exec", "task");
    const container = input.containerDefinitions![0]!;
    expect(input.requiresCompatibilities).toEqual(["FARGATE"]);
    expect(container.portMappings![0]?.containerPort).toBe(service.port);
    expect(container.healthCheck!.command!.join(" ")).toContain(String(service.port));
  });

  it("builds ECS service bound to target group", () => {
    const input = ecsServiceInput(platformServices[0]!, "cluster", "taskdef", "tg", ["subnet"], ["sg"]);
    expect(input.launchType).toBe("FARGATE");
    expect(input.loadBalancers[0]?.containerPort).toBe(platformServices[0]!.port);
  });

  it("chooses load balancer type and weighted Route53 records", () => {
    expect(chooseLoadBalancer("http")).toBe("ALB");
    expect(chooseLoadBalancer("tcp")).toBe("NLB");
    expect(targetGroupName("orders", "green")).toBe("orders-green-tg");
    const record = weightedAliasRecord("api.example.com", "ZROOT", "blue", "ZB", "green", "ZG", 25);
    expect(record.ChangeBatch!.Changes![0]!.ResourceRecordSet!.Weight).toBe(75);
    expect(record.ChangeBatch!.Changes![1]!.ResourceRecordSet!.Weight).toBe(25);
  });
});
