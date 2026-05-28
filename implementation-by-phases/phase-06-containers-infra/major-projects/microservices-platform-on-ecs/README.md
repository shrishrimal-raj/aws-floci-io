# Microservices Platform on ECS

Multi-service backend on ECS Fargate behind ALB with IaC and blue/green routing.

## Capabilities

- ECR image workflow for service containers.
- ECS Fargate task/service definitions for auth, catalog, orders, payments.
- ALB target groups and health checks.
- Route53 weighted aliases for blue/green traffic shifts.
- CloudFormation VPC/subnet template + change set/drift flow.
- ECS target tracking autoscaling.
- EKS IRSA manifests for pod identity comparison.

## Demo

```bash
pnpm --filter @floci-lab/phase-06 platform:demo
```
