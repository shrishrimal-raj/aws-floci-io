import { PutScalingPolicyCommand, RegisterScalableTargetCommand, type ApplicationAutoScalingClient } from "@aws-sdk/client-application-auto-scaling";

export interface ScalingPlan {
  clusterName: string;
  serviceName: string;
  minCapacity: number;
  maxCapacity: number;
  targetCpuPercent: number;
}

/** Builds ECS Application Auto Scaling resource ID for one service. */
export function ecsResourceId(clusterName: string, serviceName: string): string {
  return `service/${clusterName}/${serviceName}`;
}

/** ECS autoscaling helper for target tracking desired-count policies. */
export class EcsAutoScaler {
  constructor(private readonly autoScaling: ApplicationAutoScalingClient) {}

  /** Registers min/max desired task count for an ECS service. */
  async register(plan: ScalingPlan): Promise<void> {
    await this.autoScaling.send(
      new RegisterScalableTargetCommand({
        ServiceNamespace: "ecs",
        ScalableDimension: "ecs:service:DesiredCount",
        ResourceId: ecsResourceId(plan.clusterName, plan.serviceName),
        MinCapacity: plan.minCapacity,
        MaxCapacity: plan.maxCapacity,
      })
    );
  }

  /** Adds CPU target-tracking policy with practical cooldowns. */
  async putCpuPolicy(plan: ScalingPlan): Promise<void> {
    await this.autoScaling.send(
      new PutScalingPolicyCommand({
        PolicyName: `${plan.serviceName}-cpu`,
        PolicyType: "TargetTrackingScaling",
        ServiceNamespace: "ecs",
        ScalableDimension: "ecs:service:DesiredCount",
        ResourceId: ecsResourceId(plan.clusterName, plan.serviceName),
        TargetTrackingScalingPolicyConfiguration: {
          TargetValue: plan.targetCpuPercent,
          PredefinedMetricSpecification: { PredefinedMetricType: "ECSServiceAverageCPUUtilization" },
          ScaleInCooldown: 60,
          ScaleOutCooldown: 30,
        },
      })
    );
  }
}
