export interface PipelineStage {
  name: string;
  actions: string[];
  rollbackOnFailure: boolean;
}

export interface DeploymentPipeline {
  source: string;
  stages: PipelineStage[];
}

export function createSelfServicePipeline(sourceRepo: string, appName: string): DeploymentPipeline {
  return {
    source: sourceRepo,
    stages: [
      { name: "Source", actions: [`Watch ${sourceRepo}`], rollbackOnFailure: false },
      { name: "Build", actions: [`CodeBuild ${appName}`, "Run unit tests", "Publish artifact"], rollbackOnFailure: false },
      { name: "DeployGreen", actions: ["Create replacement task set", "Run BeforeAllowTraffic hook"], rollbackOnFailure: true },
      { name: "ShiftTraffic", actions: ["Shift listener to green", "Run smoke tests"], rollbackOnFailure: true },
      { name: "Bake", actions: ["Watch alarms", "Finalize deployment"], rollbackOnFailure: true },
    ],
  };
}

export function nextPipelineAction(pipeline: DeploymentPipeline, completedStageNames: string[]): PipelineStage | undefined {
  return pipeline.stages.find((stage) => !completedStageNames.includes(stage.name));
}

export function shouldRollback(stage: PipelineStage, alarmState: "OK" | "ALARM", hookPassed: boolean): boolean {
  return stage.rollbackOnFailure && (alarmState === "ALARM" || !hookPassed);
}
