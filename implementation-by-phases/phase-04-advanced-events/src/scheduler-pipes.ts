import { CreatePipeCommand, type PipesClient } from "@aws-sdk/client-pipes";
import { CreateScheduleCommand, FlexibleTimeWindowMode, type SchedulerClient } from "@aws-sdk/client-scheduler";

export interface DailyScheduleInput {
  name: string;
  targetArn: string;
  roleArn: string;
  hourUtc: number;
  payload: unknown;
}

/**
 * Creates daily EventBridge Scheduler job.
 * Example: run nightly tenant billing report or data-retention sweep without cron servers.
 */
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

/**
 * Plans SQS to Step Functions EventBridge Pipe for checkout workloads.
 * Example: queue absorbs spikes, pipe filters `CheckoutStarted`, Step Functions orchestrates saga.
 */
export function sqsToStepFunctionsPipePlan(name: string, sourceArn: string, targetArn: string, roleArn: string): PipePlan {
  return {
    name,
    sourceArn,
    targetArn,
    roleArn,
    filterPattern: { body: { eventType: ["CheckoutStarted"] } },
  };
}

/**
 * Provisions EventBridge Pipe from planned source, target, role, and optional filter.
 * Example: replace glue Lambda with managed pipe for SQS-to-workflow handoff.
 */
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
