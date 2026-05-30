# Phase 07 - DevOps & Delivery

Enterprise CI/CD patterns for Node services on AWS: CodeBuild buildspecs, CodeDeploy blue/green and canary releases, self-service pipelines, guardrails, audit logging, retries, lifecycle policies, observability, cost controls, and DR drills.

## Run

```bash
cd implementation-by-phases/phase-07-devops-delivery
pnpm install
pnpm test
pnpm lab
```

## What you learn

- Build secure CodeBuild specs with quality gates and artifacts.
- Choose rolling, canary, or blue/green deployment strategies.
- Add CloudWatch alarm rollback and CodeDeploy lifecycle hooks.
- Model self-service pipelines with approvals, audit events, and change tickets.
- Manage release evidence lifecycle for compliance and DR.
- Estimate pipeline cost and apply practical optimization tips.

## Key functions

| Function | Purpose | Real use case |
|---|---|---|
| `createNodeBuildSpec` | Creates repeatable Node CodeBuild phases. | API build with lint, tests, audit, and deploy artifacts. |
| `chooseDeploymentStrategy` | Selects rolling, canary, or blue/green. | ECS service uses blue/green; high-risk Lambda uses canary. |
| `createLambdaCanaryPlan` | Creates weighted Lambda traffic steps. | 5% traffic for 20 minutes before full release. |
| `createBlueGreenRollbackPolicy` | Adds rollback alarms and lifecycle hooks. | Roll back when 5xx or latency alarms fire. |
| `createDeploymentAuditEvent` | Produces EventBridge/SIEM-ready evidence. | Record actor, change ID, strategy, and approval evidence. |
| `createRetryPolicy` | Standardizes retry/backoff for delivery APIs. | Retry throttled CodeDeploy polling or webhook delivery. |
| `createArtifactLifecyclePolicy` | Plans artifact retention, encryption, replication, cleanup. | Keep restricted prod evidence immutable for 7 years. |
| `createObservabilityRunbook` | Defines dashboards, alarms, logs, synthetic checks. | Decide rollback during deployment bake window. |
| `createSelfServicePipeline` | Models golden-path release stages. | Product teams deploy without direct prod IAM access. |
| `evaluatePipelineGuardrails` | Blocks unsafe releases. | Require scans, approvals, tickets, and healthy alarms. |
| `createCrossAccountPromotionPlan` | Builds dev/stage/prod account promotion path. | Separate AWS accounts with least-privilege deploy roles. |
| `estimatePipelineMonthlyCost` | Estimates CodeBuild spend. | Optimize high-minute pipelines with cache and job splitting. |
| `planDisasterRecoveryDrill` | Creates release restore drill. | Redeploy last known good artifact in recovery region. |

## Enterprise examples

- `buildOrdersApiDeliveryExample` - ECS blue/green for retail checkout, with rollback, audit logging, observability, cost, and DR.
- `buildPaymentsComplianceDeliveryExample` - regulated Lambda canary with CAB approval, immutable artifacts, cross-account promotion, and conservative retries.
- `buildSaasWorkerDeliveryExample` - EventBridge-driven tenant worker with rolling release, tenant-safe build variables, fast retries, and audit evidence.

Major project: [`major-projects/self-service-deploy-platform`](./major-projects/self-service-deploy-platform/) combines these patterns into one hands-on demo.

Spec: `spec-by-phases/phase-07-devops-delivery/README.md`.
