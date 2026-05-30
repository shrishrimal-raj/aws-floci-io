export type DeploymentStrategy = "rolling" | "blue_green" | "canary";
export type ChangeRisk = "low" | "medium" | "high";
export type DataClassification = "public" | "internal" | "confidential" | "restricted";

export interface BuildPhase {
  name: "install" | "pre_build" | "build" | "post_build";
  commands: string[];
}

export interface BuildSpec {
  version: "0.2";
  env: { variables: Record<string, string> };
  phases: Record<BuildPhase["name"], { commands: string[] }>;
  artifacts: { files: string[] };
}

export interface CanaryStep {
  percent: number;
  bakeMinutes: number;
}

export interface RollbackPolicy {
  alarms: string[];
  rollbackOnFailure: boolean;
  hooks: string[];
}

export interface DeploymentAuditEvent {
  eventType: "deployment.requested" | "deployment.approved" | "deployment.completed" | "deployment.rolled_back";
  appName: string;
  environment: string;
  actor: string;
  strategy: DeploymentStrategy;
  changeId: string;
  risk: ChangeRisk;
  timestamp: string;
  evidence: Record<string, string>;
}

export interface RetryPolicy {
  maxAttempts: number;
  backoffSeconds: number[];
  retryableErrors: string[];
}

export interface ArtifactLifecyclePolicy {
  retentionDays: number;
  immutable: boolean;
  encryptionRequired: boolean;
  replicationTargets: string[];
  cleanupAction: "expire" | "archive";
}

export interface ObservabilityRunbook {
  dashboards: string[];
  alarms: string[];
  logs: string[];
  syntheticChecks: string[];
  rollbackDecision: string;
}

/**
 * Create enterprise CodeBuild buildspec for Node services.
 * Use for APIs, workers, and IaC packages that need repeatable install, test, build, and artifact steps.
 * Example: orders API builds distribution files plus `appspec.yml` before CodeDeploy shifts ECS traffic.
 */
export function createNodeBuildSpec(options: {
  nodeVersion?: string;
  appName: string;
  testCommand?: string;
  buildCommand?: string;
  artifactFiles?: string[];
  envVariables?: Record<string, string>;
  qualityGateCommands?: string[];
}): BuildSpec {
  const nodeVersion = options.nodeVersion ?? "22";
  const qualityGateCommands = options.qualityGateCommands ?? [options.testCommand ?? "pnpm test"];
  return {
    version: "0.2",
    env: { variables: { APP_NAME: options.appName, NODE_VERSION: nodeVersion, ...(options.envVariables ?? {}) } },
    phases: {
      install: { commands: [`n $NODE_VERSION || true`, "corepack enable", "pnpm install --frozen-lockfile"] },
      pre_build: { commands: qualityGateCommands },
      build: { commands: [options.buildCommand ?? "pnpm build"] },
      post_build: { commands: ["printf 'build complete for %s\\n' $APP_NAME"] },
    },
    artifacts: { files: options.artifactFiles ?? ["dist/**/*", "appspec.yml"] },
  };
}

/**
 * Create safe Lambda weighted traffic plan.
 * Use when high-risk serverless changes need gradual exposure and CloudWatch alarm bake time.
 * Example: send 10% for 15 minutes, then 100% only after alarms stay OK.
 */
export function createLambdaCanaryPlan(initialPercent = 10, bakeMinutes = 15): CanaryStep[] {
  if (initialPercent <= 0 || initialPercent >= 100) throw new Error("initialPercent must be between 1 and 99");
  if (bakeMinutes <= 0) throw new Error("bakeMinutes must be positive");
  return [
    { percent: initialPercent, bakeMinutes },
    { percent: 100, bakeMinutes: 0 },
  ];
}

/**
 * Create CodeDeploy rollback policy with required alarms and lifecycle hooks.
 * Use for ECS blue/green and Lambda deployments where failed hooks or alarms must stop release automatically.
 * Example: rollback orders API when 5xx or p95 latency alarms fire during traffic shift.
 */
export function createBlueGreenRollbackPolicy(appName: string, alarms: string[]): RollbackPolicy {
  if (!alarms.length) throw new Error("at least one alarm required for automated rollback");
  return {
    alarms,
    rollbackOnFailure: true,
    hooks: [
      `${appName}:BeforeInstall`,
      `${appName}:AfterInstall`,
      `${appName}:BeforeAllowTraffic`,
      `${appName}:AfterAllowTraffic`,
    ],
  };
}

/**
 * Select safest deployment strategy for workload and change risk.
 * ECS defaults to blue/green because replacement task sets support quick rollback; Lambda uses canary for risky changes.
 */
export function chooseDeploymentStrategy(target: "lambda" | "ecs", highRiskChange: boolean): DeploymentStrategy {
  if (target === "ecs") return "blue_green";
  return highRiskChange ? "canary" : "rolling";
}

/**
 * Emit audit event suitable for EventBridge, CloudTrail Lake, or SIEM ingestion.
 * Use every deployment transition to prove who changed what, when, why, and with what evidence.
 */
export function createDeploymentAuditEvent(input: {
  eventType: DeploymentAuditEvent["eventType"];
  appName: string;
  environment: string;
  actor: string;
  strategy: DeploymentStrategy;
  changeId: string;
  risk: ChangeRisk;
  timestamp?: string;
  evidence?: Record<string, string>;
}): DeploymentAuditEvent {
  return {
    eventType: input.eventType,
    appName: input.appName,
    environment: input.environment,
    actor: input.actor,
    strategy: input.strategy,
    changeId: input.changeId,
    risk: input.risk,
    timestamp: input.timestamp ?? new Date().toISOString(),
    evidence: input.evidence ?? {},
  };
}

/**
 * Standard retry profile for flaky delivery integrations.
 * Use around CodeBuild start, CodeDeploy status polling, GitHub webhooks, and EventBridge publishes.
 */
export function createRetryPolicy(profile: "fast" | "standard" | "conservative" = "standard"): RetryPolicy {
  if (profile === "fast") return { maxAttempts: 3, backoffSeconds: [1, 2, 4], retryableErrors: ["ThrottlingException", "TooManyRequestsException"] };
  if (profile === "conservative") {
    return { maxAttempts: 6, backoffSeconds: [5, 10, 20, 40, 80, 160], retryableErrors: ["ThrottlingException", "ServiceUnavailable", "InternalServerError"] };
  }
  return { maxAttempts: 4, backoffSeconds: [2, 5, 10, 20], retryableErrors: ["ThrottlingException", "ServiceUnavailable"] };
}

/**
 * Plan artifact retention, encryption, cleanup, and cross-region replication.
 * Use to manage build artifacts, SBOMs, release manifests, and compliance evidence lifecycle.
 */
export function createArtifactLifecyclePolicy(input: {
  environment: "dev" | "test" | "stage" | "prod";
  classification: DataClassification;
  regions?: string[];
}): ArtifactLifecyclePolicy {
  const regulated = input.classification === "confidential" || input.classification === "restricted";
  const prod = input.environment === "prod";
  return {
    retentionDays: prod ? (regulated ? 2555 : 365) : 30,
    immutable: prod || regulated,
    encryptionRequired: true,
    replicationTargets: prod ? input.regions ?? ["us-east-1", "us-west-2"] : [],
    cleanupAction: prod || regulated ? "archive" : "expire",
  };
}

/**
 * Build observability checklist for deployment health decisions.
 * Use during bake windows to connect CloudWatch alarms, logs, dashboards, and synthetic tests to rollback action.
 */
export function createObservabilityRunbook(appName: string, serviceLevelObjective: { availabilityPercent: number; p95LatencyMs: number }): ObservabilityRunbook {
  return {
    dashboards: [`${appName}-service-health`, `${appName}-deployment-bake`],
    alarms: [`${appName}-5xx-rate`, `${appName}-p95-latency-${serviceLevelObjective.p95LatencyMs}ms`, `${appName}-availability-${serviceLevelObjective.availabilityPercent}`],
    logs: [`/aws/ecs/${appName}`, `/aws/codebuild/${appName}`],
    syntheticChecks: [`${appName}-critical-user-journey`],
    rollbackDecision: `Rollback when any alarm is ALARM or synthetic check fails during bake window.`,
  };
}
