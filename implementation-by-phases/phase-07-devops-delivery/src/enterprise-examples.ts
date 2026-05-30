import {
  chooseDeploymentStrategy,
  createArtifactLifecyclePolicy,
  createBlueGreenRollbackPolicy,
  createDeploymentAuditEvent,
  createLambdaCanaryPlan,
  createNodeBuildSpec,
  createObservabilityRunbook,
  createRetryPolicy,
  type DeploymentAuditEvent,
  type DeploymentStrategy,
} from "./deployment.js";
import {
  createCrossAccountPromotionPlan,
  createSelfServicePipeline,
  estimatePipelineMonthlyCost,
  evaluatePipelineGuardrails,
  planDisasterRecoveryDrill,
  type DeploymentPipeline,
  type PipelineGuardrailResult,
} from "./pipeline.js";

export interface EnterpriseDeliveryExample {
  name: string;
  scenario: string;
  functions: string[];
  strategy: DeploymentStrategy;
  implementation: Record<string, unknown>;
}

/**
 * Complete ECS blue/green delivery example for customer-facing orders API.
 * Demonstrates secure access, audit logging, rollback alarms, cost controls, observability, and DR.
 */
export function buildOrdersApiDeliveryExample(): EnterpriseDeliveryExample {
  const strategy = chooseDeploymentStrategy("ecs", true);
  const pipeline = createSelfServicePipeline("github.com/acme/orders-api", "orders-api");
  const audit = createDeploymentAuditEvent({
    eventType: "deployment.requested",
    appName: "orders-api",
    environment: "prod",
    actor: "platform-bot",
    strategy,
    changeId: "CHG-1042",
    risk: "high",
    evidence: { pullRequest: "https://github.com/acme/orders-api/pull/88", sbom: "s3://release-evidence/orders-api/sbom.json" },
  });

  return {
    name: "Orders API ECS blue/green release",
    scenario: "Retail checkout API deploys through CodeBuild and CodeDeploy with smoke tests and alarm-based rollback.",
    functions: [
      "createNodeBuildSpec",
      "chooseDeploymentStrategy",
      "createBlueGreenRollbackPolicy",
      "createSelfServicePipeline",
      "createDeploymentAuditEvent",
      "createObservabilityRunbook",
      "estimatePipelineMonthlyCost",
      "planDisasterRecoveryDrill",
    ],
    strategy,
    implementation: {
      buildspec: createNodeBuildSpec({
        appName: "orders-api",
        artifactFiles: ["dist/**/*", "appspec.yml", "taskdef.json", "imageDetail.json"],
        qualityGateCommands: ["pnpm lint", "pnpm test", "pnpm audit --audit-level high"],
        envVariables: { SERVICE: "orders", DEPLOYMENT_SYSTEM: "codepipeline" },
      }),
      pipeline,
      rollback: createBlueGreenRollbackPolicy("orders-api", ["orders-api-5xx-rate", "orders-api-p95-latency"]),
      observability: createObservabilityRunbook("orders-api", { availabilityPercent: 99.9, p95LatencyMs: 300 }),
      audit,
      cost: estimatePipelineMonthlyCost({ buildsPerDay: 30, averageBuildMinutes: 8 }),
      disasterRecovery: planDisasterRecoveryDrill("orders-api", "us-west-2"),
    },
  };
}

/**
 * Regulated payments release example with production approvals and long-lived evidence.
 * Demonstrates compliance-oriented guardrails, artifact lifecycle management, audit events, and conservative retries.
 */
export function buildPaymentsComplianceDeliveryExample(): EnterpriseDeliveryExample {
  const strategy = chooseDeploymentStrategy("lambda", true);
  const guardrails: PipelineGuardrailResult = evaluatePipelineGuardrails({
    environment: "prod",
    approvers: ["risk-owner", "platform-owner"],
    securityScanPassed: true,
    changeTicket: "CAB-2026-0021",
    alarmState: "OK",
  });
  const audit: DeploymentAuditEvent = createDeploymentAuditEvent({
    eventType: "deployment.approved",
    appName: "payments-ledger-writer",
    environment: "prod",
    actor: "risk-owner",
    strategy,
    changeId: "CAB-2026-0021",
    risk: "high",
    evidence: { approval: "servicenow://CAB-2026-0021", vulnerabilityScan: "passed" },
  });

  return {
    name: "Payments Lambda canary with compliance evidence",
    scenario: "Financial ledger writer deploys by canary with CAB approval, immutable artifacts, encrypted evidence, and rollback alarms.",
    functions: [
      "createLambdaCanaryPlan",
      "createArtifactLifecyclePolicy",
      "evaluatePipelineGuardrails",
      "createDeploymentAuditEvent",
      "createRetryPolicy",
      "createCrossAccountPromotionPlan",
    ],
    strategy,
    implementation: {
      canary: createLambdaCanaryPlan(5, 20),
      lifecycle: createArtifactLifecyclePolicy({ environment: "prod", classification: "restricted", regions: ["us-east-1", "us-west-2"] }),
      guardrails,
      audit,
      retry: createRetryPolicy("conservative"),
      promotion: createCrossAccountPromotionPlan("payments-ledger-writer", ["dev", "stage", "prod"]),
    },
  };
}

/**
 * SaaS multi-tenant worker release example for event-driven processing.
 * Demonstrates safe low-risk Lambda rolling deployment plus EventBridge audit evidence and tenant-aware build variables.
 */
export function buildSaasWorkerDeliveryExample(): EnterpriseDeliveryExample {
  const strategy = chooseDeploymentStrategy("lambda", false);
  const pipeline: DeploymentPipeline = createSelfServicePipeline("github.com/acme/tenant-billing-worker", "tenant-billing-worker");

  return {
    name: "SaaS tenant billing worker rolling release",
    scenario: "Event-driven billing worker consumes EventBridge events and deploys small low-risk changes with fast retries and tenant audit evidence.",
    functions: [
      "createNodeBuildSpec",
      "chooseDeploymentStrategy",
      "createRetryPolicy",
      "createDeploymentAuditEvent",
      "nextPipelineAction",
    ],
    strategy,
    implementation: {
      buildspec: createNodeBuildSpec({
        appName: "tenant-billing-worker",
        testCommand: "pnpm test -- --runInBand",
        buildCommand: "pnpm build:lambda",
        envVariables: { EVENT_BUS: "tenant-events", TENANT_MODE: "pooled" },
      }),
      pipeline,
      retry: createRetryPolicy("fast"),
      audit: createDeploymentAuditEvent({
        eventType: "deployment.completed",
        appName: "tenant-billing-worker",
        environment: "stage",
        actor: "release-bot",
        strategy,
        changeId: "PR-331",
        risk: "low",
        evidence: { eventBus: "tenant-events", smokeTest: "tenant-invoice-generated" },
      }),
    },
  };
}
