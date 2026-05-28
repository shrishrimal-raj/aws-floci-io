import { PutScalingPolicyCommand, RegisterScalableTargetCommand, type ApplicationAutoScalingClient } from "@aws-sdk/client-application-auto-scaling";

export interface ScalingPlan {
  clusterName: string;
  serviceName: string;
  minCapacity: number;
  maxCapacity: number;
  targetCpuPercent: number;
}

export function ecsResourceId(clusterName: string, serviceName: string): string {
  return `service/${clusterName}/${serviceName}`;
}

export class EcsAutoScaler {
  constructor(private readonly autoScaling: ApplicationAutoScalingClient) {}

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
