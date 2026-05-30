import { CreateServiceCommand, RegisterTaskDefinitionCommand, type ECSClient, type RegisterTaskDefinitionCommandInput } from "@aws-sdk/client-ecs";

export interface ServiceDefinition {
  name: string;
  image: string;
  port: number;
  cpu: number;
  memory: number;
  desiredCount: number;
  environment?: Record<string, string>;
}

/** Baseline enterprise microservices used across examples: auth, catalog, orders, payments. */
export const platformServices: ServiceDefinition[] = [
  { name: "auth", image: "auth:latest", port: 3000, cpu: 256, memory: 512, desiredCount: 2 },
  { name: "catalog", image: "catalog:latest", port: 3001, cpu: 256, memory: 512, desiredCount: 2 },
  { name: "orders", image: "orders:latest", port: 3002, cpu: 512, memory: 1024, desiredCount: 2 },
  { name: "payments", image: "payments:latest", port: 3003, cpu: 512, memory: 1024, desiredCount: 2 },
];

/** Builds a secure Fargate task definition with health checks and CloudWatch logs. */
export function taskDefinitionInput(service: ServiceDefinition, executionRoleArn: string, taskRoleArn: string): RegisterTaskDefinitionCommandInput {
  return {
    family: service.name,
    requiresCompatibilities: ["FARGATE"],
    networkMode: "awsvpc",
    cpu: String(service.cpu),
    memory: String(service.memory),
    executionRoleArn,
    taskRoleArn,
    containerDefinitions: [
      {
        name: service.name,
        image: service.image,
        essential: true,
        portMappings: [{ containerPort: service.port, protocol: "tcp" }],
        environment: Object.entries(service.environment ?? {}).map(([name, value]) => ({ name, value })),
        healthCheck: { command: ["CMD-SHELL", `curl -f http://localhost:${service.port}/health || exit 1`], interval: 30, timeout: 5, retries: 3 },
        logConfiguration: { logDriver: "awslogs", options: { "awslogs-group": `/ecs/${service.name}`, "awslogs-region": "us-east-1", "awslogs-stream-prefix": "ecs" } },
      },
    ],
  };
}

/** Builds ECS service input for private-subnet Fargate tasks behind a target group. */
export function ecsServiceInput(service: ServiceDefinition, clusterArn: string, taskDefinitionArn: string, targetGroupArn: string, subnets: string[], securityGroups: string[]) {
  return {
    serviceName: service.name,
    cluster: clusterArn,
    taskDefinition: taskDefinitionArn,
    desiredCount: service.desiredCount,
    launchType: "FARGATE" as const,
    deploymentController: { type: "ECS" as const },
    networkConfiguration: { awsvpcConfiguration: { subnets, securityGroups, assignPublicIp: "DISABLED" as const } },
    loadBalancers: [{ targetGroupArn, containerName: service.name, containerPort: service.port }],
    healthCheckGracePeriodSeconds: 60,
  };
}

/** ECS Fargate wrapper for registering task definitions and creating services. */
export class EcsFargateService {
  constructor(private readonly ecs: ECSClient) {}

  /** Registers one deployable task definition revision for a service. */
  async registerTask(service: ServiceDefinition, executionRoleArn: string, taskRoleArn: string): Promise<string | undefined> {
    const result = await this.ecs.send(new RegisterTaskDefinitionCommand(taskDefinitionInput(service, executionRoleArn, taskRoleArn)));
    return result.taskDefinition?.taskDefinitionArn;
  }

  /** Creates the ECS service bound to ALB/NLB target group and private networking. */
  async create(service: ServiceDefinition, clusterArn: string, taskDefinitionArn: string, targetGroupArn: string, subnets: string[], securityGroups: string[]): Promise<string | undefined> {
    const result = await this.ecs.send(new CreateServiceCommand(ecsServiceInput(service, clusterArn, taskDefinitionArn, targetGroupArn, subnets, securityGroups)));
    return result.service?.serviceArn;
  }
}
