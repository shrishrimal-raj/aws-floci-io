export interface PipelineStage {
  name: string;
  actions: string[];
  rollbackOnFailure: boolean;
  requiredApprovers?: number;
  auditEvent?: string;
}

export interface DeploymentPipeline {
  source: string;
  stages: PipelineStage[];
}

export interface PipelineGuardrailContext {
  environment: "dev" | "test" | "stage" | "prod";
  approvers: string[];
  securityScanPassed: boolean;
  changeTicket?: string;
  alarmState: "OK" | "ALARM";
}

export interface PipelineGuardrailResult {
  approved: boolean;
  findings: string[];
}

export interface CrossAccountPromotionStep {
  accountAlias: string;
  environment: PipelineGuardrailContext["environment"];
  requiredApprovers: number;
  deploymentRole: string;
}

export interface PipelineCostEstimate {
  monthlyBuildMinutes: number;
  estimatedCodeBuildUsd: number;
  optimizationTips: string[];
}

export interface DisasterRecoveryDrill {
  name: string;
  frequencyDays: number;
  successCriteria: string[];
  recoveryActions: string[];
}

/**
 * Model self-service enterprise release pipeline.
 * Use when platform teams expose a golden path from Git push to CodeBuild, CodeDeploy blue/green, smoke tests, and bake.
 * Example: product team deploys orders API without direct production IAM permissions.
 */
export function createSelfServicePipeline(sourceRepo: string, appName: string): DeploymentPipeline {
  return {
    source: sourceRepo,
    stages: [
      { name: "Source", actions: [`Watch ${sourceRepo}`], rollbackOnFailure: false, auditEvent: "deployment.requested" },
      { name: "Build", actions: [`CodeBuild ${appName}`, "Run unit tests", "Run SAST", "Publish artifact"], rollbackOnFailure: false },
      { name: "DeployGreen", actions: ["Create replacement task set", "Run BeforeAllowTraffic hook"], rollbackOnFailure: true },
      { name: "ShiftTraffic", actions: ["Shift listener to green", "Run smoke tests"], rollbackOnFailure: true },
      { name: "Bake", actions: ["Watch alarms", "Finalize deployment", "Write audit evidence"], rollbackOnFailure: true, auditEvent: "deployment.completed" },
    ],
  };
}

/**
 * Return next stage that has not completed.
 * Use in dashboards, ChatOps bots, and release controllers to show current deployment action.
 */
export function nextPipelineAction(pipeline: DeploymentPipeline, completedStageNames: string[]): PipelineStage | undefined {
  return pipeline.stages.find((stage) => !completedStageNames.includes(stage.name));
}

/**
 * Decide if current stage should roll back.
 * Use in CodeDeploy hooks or release orchestrators after smoke tests and CloudWatch alarm checks.
 */
export function shouldRollback(stage: PipelineStage, alarmState: "OK" | "ALARM", hookPassed: boolean): boolean {
  return stage.rollbackOnFailure && (alarmState === "ALARM" || !hookPassed);
}

/**
 * Evaluate production guardrails before deployment continues.
 * Use to block releases missing security scans, change tickets, approvals, or healthy alarms.
 */
export function evaluatePipelineGuardrails(context: PipelineGuardrailContext): PipelineGuardrailResult {
  const findings: string[] = [];
  if (!context.securityScanPassed) findings.push("security scan must pass before deployment");
  if (context.alarmState === "ALARM") findings.push("active alarm blocks deployment");
  if (context.environment === "prod" && context.approvers.length < 2) findings.push("production requires two approvers");
  if (context.environment === "prod" && !context.changeTicket) findings.push("production requires change ticket");
  return { approved: findings.length === 0, findings };
}

/**
 * Create cross-account promotion path with least-privilege deployment roles.
 * Use when dev, stage, and prod live in separate AWS accounts under AWS Organizations.
 */
export function createCrossAccountPromotionPlan(appName: string, environments: PipelineGuardrailContext["environment"][]): CrossAccountPromotionStep[] {
  return environments.map((environment) => ({
    accountAlias: `${appName}-${environment}`,
    environment,
    requiredApprovers: environment === "prod" ? 2 : environment === "stage" ? 1 : 0,
    deploymentRole: `arn:aws:iam::${environment.toUpperCase()}-ACCOUNT:role/${appName}-${environment}-deploy-role`,
  }));
}

/**
 * Estimate pipeline build cost and suggest optimization levers.
 * Use during platform reviews to control CodeBuild minutes and artifact retention spend.
 */
export function estimatePipelineMonthlyCost(input: { buildsPerDay: number; averageBuildMinutes: number; costPerMinuteUsd?: number }): PipelineCostEstimate {
  const monthlyBuildMinutes = input.buildsPerDay * input.averageBuildMinutes * 30;
  const estimatedCodeBuildUsd = Number((monthlyBuildMinutes * (input.costPerMinuteUsd ?? 0.005)).toFixed(2));
  const optimizationTips = ["cache pnpm store", "split lint/test/build jobs", "skip deploy on docs-only changes"];
  if (monthlyBuildMinutes > 1000) optimizationTips.push("use reserved or right-sized CodeBuild compute");
  return { monthlyBuildMinutes, estimatedCodeBuildUsd, optimizationTips };
}

/**
 * Plan backup and disaster recovery release drill.
 * Use to test artifact restore, redeployment from immutable artifacts, and rollback under regional failure.
 */
export function planDisasterRecoveryDrill(appName: string, recoveryRegion: string): DisasterRecoveryDrill {
  return {
    name: `${appName}-release-dr-drill`,
    frequencyDays: 90,
    successCriteria: ["restore artifact from replicated bucket", "deploy using cross-region role", "pass smoke tests", "record audit evidence"],
    recoveryActions: [`promote replicated artifact in ${recoveryRegion}`, "redeploy last known good revision", "validate alarms and dashboards"],
  };
}
