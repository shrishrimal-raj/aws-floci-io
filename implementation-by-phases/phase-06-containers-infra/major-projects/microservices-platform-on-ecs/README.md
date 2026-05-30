# Microservices Platform on ECS

Hands-on enterprise platform: four services on ECS Fargate, ALB ingress, Route53 blue/green routing, CloudFormation network IaC, EKS IRSA comparison, and operations guardrails.

## Capabilities

- ECR image workflow with scan-on-push and lifecycle policy.
- ECS Fargate task/service definitions for auth, catalog, orders, payments.
- Private subnet service placement with public ALB ingress.
- ALB target groups, health checks, and Route53 weighted canary shifts.
- CloudFormation VPC/subnet template, change sets, and drift detection.
- ECS target tracking autoscaling.
- Audit events, retry strategy, EventBridge-style deployment events.
- CloudWatch dashboard body, Fargate cost estimate, DR runbook, compliance findings.
- EKS IRSA service-account and deployment manifests for workload identity.

## Demos

```bash
pnpm --filter @floci-lab/phase-06 platform:demo
pnpm --filter @floci-lab/phase-06 platform:enterprise-demo
```

Use `platform:demo` for quick primitive overview. Use `platform:enterprise-demo` for full enterprise scenario with secure access, audit, retries, lifecycle, observability, cost, DR, and compliance.
