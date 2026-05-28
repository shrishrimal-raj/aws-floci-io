export type DeploymentStrategy = "rolling" | "blue_green" | "canary";

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

export function createNodeBuildSpec(options: {
  nodeVersion?: string;
  appName: string;
  testCommand?: string;
  buildCommand?: string;
  artifactFiles?: string[];
}): BuildSpec {
  const nodeVersion = options.nodeVersion ?? "22";
  return {
    version: "0.2",
    env: { variables: { APP_NAME: options.appName, NODE_VERSION: nodeVersion } },
    phases: {
      install: { commands: [`n $NODE_VERSION || true`, "corepack enable", "pnpm install --frozen-lockfile"] },
      pre_build: { commands: [options.testCommand ?? "pnpm test"] },
      build: { commands: [options.buildCommand ?? "pnpm build"] },
      post_build: { commands: ["printf 'build complete for %s\\n' $APP_NAME"] },
    },
    artifacts: { files: options.artifactFiles ?? ["dist/**/*", "appspec.yml"] },
  };
}

export function createLambdaCanaryPlan(initialPercent = 10, bakeMinutes = 15): CanaryStep[] {
  if (initialPercent <= 0 || initialPercent >= 100) throw new Error("initialPercent must be between 1 and 99");
  if (bakeMinutes <= 0) throw new Error("bakeMinutes must be positive");
  return [
    { percent: initialPercent, bakeMinutes },
    { percent: 100, bakeMinutes: 0 },
  ];
}

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

export function chooseDeploymentStrategy(target: "lambda" | "ecs", highRiskChange: boolean): DeploymentStrategy {
  if (target === "ecs") return "blue_green";
  return highRiskChange ? "canary" : "rolling";
}
