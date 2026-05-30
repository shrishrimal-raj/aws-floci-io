# Phase 06 - Containers & Infrastructure implementation

Enterprise container platform building blocks for ECS, ECR, EKS, CloudFormation, ALB, Route53, autoscaling, and operations.

## What you learn

- Build and push secure ECR images with scan-on-push and lifecycle cleanup.
- Run ECS Fargate services in private subnets behind ALB target groups.
- Use Route53 weighted records for blue/green and canary releases.
- Manage VPC infrastructure with CloudFormation change sets and drift checks.
- Use EKS IRSA instead of static AWS keys in pods.
- Add retries, audit events, deployment events, dashboards, cost estimates, DR runbooks, and compliance gates.

## Key files

- `src/container-image.ts` - ECR image URI, Docker commands, repository helper.
- `src/ecs-platform.ts` - service model, task definitions, ECS service input, Fargate wrapper.
- `src/load-balancing.ts` - ALB target groups and Route53 blue/green records.
- `src/cloudformation.ts` - VPC template, template validation, change sets, drift detection.
- `src/eks-irsa.ts` - IRSA trust policy and Kubernetes manifests.
- `src/autoscaling.ts` - ECS target tracking autoscaling.
- `src/enterprise-patterns.ts` - audit logging, retries, EventBridge-style events, lifecycle, observability, cost, DR, compliance.
- `src/examples/` - separate real-world scenarios for ECS, EKS, and operations.
- `major-projects/microservices-platform-on-ecs/` - integrated hands-on platform demo.

## Run

```bash
pnpm install
pnpm --filter @floci-lab/phase-06 test
pnpm --filter @floci-lab/phase-06 platform:demo
pnpm --filter @floci-lab/phase-06 platform:enterprise-demo
```

## Example scenarios

1. **Secure ECS orders service** - image build, private service networking, blue/green Route53, audit record, compliance evidence, cost estimate.
2. **Event-driven operations** - retry transient throttling, emit deployment event, build CloudWatch dashboard body, prepare DR runbook.
3. **EKS IRSA compliance** - trust policy, service account, deployment manifest, audit record, compliance gate.

## Production notes

Keep tasks in private subnets and ALBs in public subnets. Use scan-on-push, image lifecycle cleanup, least-privilege task roles, CloudWatch logs, and explicit health checks. Review CloudFormation change sets before updates and run drift detection after manual recovery. Use weighted Route53 records for safe rollout and documented rollback. Tag services with `CostCenter` and `Owner` for allocation and compliance evidence.
