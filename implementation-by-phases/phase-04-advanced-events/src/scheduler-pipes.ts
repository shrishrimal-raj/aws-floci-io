import { CreatePipeCommand, type PipesClient } from "@aws-sdk/client-pipes";
import { CreateScheduleCommand, FlexibleTimeWindowMode, type SchedulerClient } from "@aws-sdk/client-scheduler";

export interface DailyScheduleInput {
  name: string;
  targetArn: string;
  roleArn: string;
  hourUtc: number;
  payload: unknown;
}

export class CommerceScheduler {
  constructor(private readonly scheduler: SchedulerClient) {}

  async createDaily(input: DailyScheduleInput): Promise<void> {
    await this.scheduler.send(
      new CreateScheduleCommand({
        Name: input.name,
        ScheduleExpression: `cron(0 ${input.hourUtc} * * ? *)`,
        FlexibleTimeWindow: { Mode: FlexibleTimeWindowMode.OFF },
        Target: { Arn: input.targetArn, RoleArn: input.roleArn, Input: JSON.stringify(input.payload) },
      })
    );
  }
}

export interface PipePlan {
  name: string;
  sourceArn: string;
  targetArn: string;
  roleArn: string;
  filterPattern?: Record<string, unknown>;
}

export function sqsToStepFunctionsPipePlan(name: string, sourceArn: string, targetArn: string, roleArn: string): PipePlan {
  return {
    name,
    sourceArn,
    targetArn,
    roleArn,
    filterPattern: { body: { eventType: ["CheckoutStarted"] } },
  };
}

export class CommercePipeProvisioner {
  constructor(private readonly pipes: PipesClient) {}

  async create(plan: PipePlan): Promise<void> {
    await this.pipes.send(
      new CreatePipeCommand({
        Name: plan.name,
        Source: plan.sourceArn,
        Target: plan.targetArn,
        RoleArn: plan.roleArn,
        ...(plan.filterPattern && { SourceParameters: { FilterCriteria: { Filters: [{ Pattern: JSON.stringify(plan.filterPattern) }] } } }),
      })
    );
  }
}
