export interface AuditContext {
  tenantId: string;
  actorId: string;
  requestId: string;
  sourceIp?: string;
}

export interface AuditEventInput {
  action: string;
  resource: string;
  result: "ALLOW" | "DENY" | "ERROR";
  context: AuditContext;
  metadata?: Record<string, string | number | boolean>;
}

export interface AuditEvent {
  version: "2024-06";
  timestamp: string;
  action: string;
  resource: string;
  result: "ALLOW" | "DENY" | "ERROR";
  tenantId: string;
  actorId: string;
  requestId: string;
  sourceIp?: string;
  metadata: Record<string, string | number | boolean>;
}

/**
 * Builds one immutable audit record for container operations.
 *
 * Real-world use: write this JSON to CloudWatch Logs, Firehose, or S3 before
 * creating ECS services, shifting Route53 traffic, or granting EKS workload access.
 */
export function auditEvent(input: AuditEventInput, now = new Date()): AuditEvent {
  return {
    version: "2024-06",
    timestamp: now.toISOString(),
    action: input.action,
    resource: input.resource,
    result: input.result,
    tenantId: input.context.tenantId,
    actorId: input.context.actorId,
    requestId: input.context.requestId,
    sourceIp: input.context.sourceIp,
    metadata: input.metadata ?? {},
  };
}

export interface RetryPolicy {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  retryableErrors?: string[];
}

/**
 * Calculates exponential backoff with deterministic jitter cap.
 *
 * Real-world use: retry throttled ECR/ECS/CloudFormation calls without creating
 * retry storms during large enterprise deployments.
 */
export function backoffDelayMs(attempt: number, policy: RetryPolicy): number {
  const exponential = policy.baseDelayMs * 2 ** Math.max(0, attempt - 1);
  const jitter = Math.min(policy.baseDelayMs, attempt * 17);
  return Math.min(policy.maxDelayMs, exponential + jitter);
}

/**
 * Executes an async operation with retry rules and returns final result.
 *
 * Real-world use: wrap create-change-set, register-task-definition, and
 * Route53 traffic-shift calls so transient throttling does not fail rollout.
 */
export async function retryWithBackoff<T>(operation: () => Promise<T>, policy: RetryPolicy, sleep: (ms: number) => Promise<void> = async () => {}): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= policy.maxAttempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      const code = typeof error === "object" && error && "name" in error ? String((error as { name: unknown }).name) : "UnknownError";
      const retryable = !policy.retryableErrors || policy.retryableErrors.includes(code);
      if (!retryable || attempt === policy.maxAttempts) break;
      await sleep(backoffDelayMs(attempt, policy));
    }
  }
  throw lastError;
}

export interface ContainerDeploymentEventInput {
  serviceName: string;
  imageUri: string;
  environment: "dev" | "stage" | "prod";
  version: string;
  actorId: string;
}

/**
 * Creates an EventBridge PutEvents entry for container deployment events.
 *
 * Real-world use: notify security scanners, Slack bots, audit processors, or
 * post-deploy smoke-test workflows when new service images go live.
 */
export function containerDeploymentEvent(input: ContainerDeploymentEventInput): Record<string, unknown> {
  return {
    Source: "floci.containers",
    DetailType: "ContainerDeploymentRequested",
    Detail: JSON.stringify(input),
    Resources: [input.imageUri],
  };
}

/**
 * Creates an ECR lifecycle policy that keeps recent prod images and expires old builds.
 *
 * Real-world use: control storage cost while preserving rollback versions for
 * production incident recovery.
 */
export function ecrLifecyclePolicy(maxUntaggedImageDays = 14, keepTaggedImageCount = 30): string {
  return JSON.stringify({
    rules: [
      {
        rulePriority: 1,
        description: `Keep last ${keepTaggedImageCount} tagged release images`,
        selection: { tagStatus: "tagged", tagPrefixList: ["v", "release"], countType: "imageCountMoreThan", countNumber: keepTaggedImageCount },
        action: { type: "expire" },
      },
      {
        rulePriority: 2,
        description: `Expire untagged images older than ${maxUntaggedImageDays} days`,
        selection: { tagStatus: "untagged", countType: "sinceImagePushed", countUnit: "days", countNumber: maxUntaggedImageDays },
        action: { type: "expire" },
      },
    ],
  });
}

export interface DashboardAlarmTarget {
  serviceName: string;
  clusterName: string;
  targetCpuPercent: number;
}

/**
 * Builds a compact CloudWatch dashboard body for ECS service operations.
 *
 * Real-world use: put CPU, memory, and running task count in one deployment
 * dashboard so SRE teams can validate rollout health quickly.
 */
export function ecsServiceDashboardBody(region: string, targets: DashboardAlarmTarget[]): string {
  return JSON.stringify({
    widgets: targets.flatMap((target, index) => [
      {
        type: "metric",
        x: 0,
        y: index * 6,
        width: 12,
        height: 6,
        properties: {
          region,
          title: `${target.serviceName} CPU/Memory`,
          metrics: [
            ["AWS/ECS", "CPUUtilization", "ClusterName", target.clusterName, "ServiceName", target.serviceName],
            [".", "MemoryUtilization", ".", ".", ".", "."],
          ],
          annotations: { horizontal: [{ label: "target CPU", value: target.targetCpuPercent }] },
        },
      },
    ]),
  });
}

export interface FargateCostInput {
  taskCount: number;
  cpuUnits: number;
  memoryMb: number;
  hoursPerMonth?: number;
  vcpuHourUsd?: number;
  gbHourUsd?: number;
}

/**
 * Estimates monthly ECS Fargate compute cost from task shape.
 *
 * Real-world use: compare service sizes before raising desired count or moving
 * non-critical workers to scheduled/off-hours capacity.
 */
export function estimateFargateMonthlyCost(input: FargateCostInput): number {
  const hours = input.hoursPerMonth ?? 730;
  const vcpuPrice = input.vcpuHourUsd ?? 0.04048;
  const memoryPrice = input.gbHourUsd ?? 0.004445;
  const vcpu = input.cpuUnits / 1024;
  const memoryGb = input.memoryMb / 1024;
  return Number((input.taskCount * hours * (vcpu * vcpuPrice + memoryGb * memoryPrice)).toFixed(2));
}

export interface BackupRunbookStep {
  order: number;
  action: string;
  owner: string;
  evidence: string;
}

/**
 * Generates disaster-recovery runbook steps for container platforms.
 *
 * Real-world use: rehearse regional failover across ECR images, CloudFormation
 * network stacks, ECS desired count, Route53 traffic, and post-restore audit evidence.
 */
export function containerPlatformDrRunbook(primaryRegion: string, recoveryRegion: string): BackupRunbookStep[] {
  return [
    { order: 1, action: `replicate ECR release images from ${primaryRegion} to ${recoveryRegion}`, owner: "platform", evidence: "ECR image digest match" },
    { order: 2, action: `deploy CloudFormation network stack in ${recoveryRegion}`, owner: "network", evidence: "change set execution id" },
    { order: 3, action: "start ECS services with minimum safe desired count", owner: "service", evidence: "running task count" },
    { order: 4, action: "shift Route53 weighted alias to recovery ALB", owner: "sre", evidence: "DNS change id" },
    { order: 5, action: "capture audit and compliance evidence", owner: "security", evidence: "incident timeline object" },
  ];
}

export interface ComplianceFinding {
  control: string;
  status: "PASS" | "FAIL";
  evidence: string;
}

/**
 * Evaluates simple compliance controls for a container service definition.
 *
 * Real-world use: block deployments that miss private networking, image scanning,
 * audit tags, or minimum high-availability settings.
 */
export function complianceFindings(input: { privateSubnets: string[]; scanOnPush: boolean; desiredCount: number; tags: Record<string, string> }): ComplianceFinding[] {
  return [
    { control: "private-networking", status: input.privateSubnets.length >= 2 ? "PASS" : "FAIL", evidence: `${input.privateSubnets.length} private subnets` },
    { control: "image-scanning", status: input.scanOnPush ? "PASS" : "FAIL", evidence: `scanOnPush=${input.scanOnPush}` },
    { control: "high-availability", status: input.desiredCount >= 2 ? "PASS" : "FAIL", evidence: `desiredCount=${input.desiredCount}` },
    { control: "cost-allocation", status: input.tags.CostCenter && input.tags.Owner ? "PASS" : "FAIL", evidence: Object.keys(input.tags).sort().join(",") },
  ];
}
