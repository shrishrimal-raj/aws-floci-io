# Phase 06 - Containers & Infrastructure implementation

Container platform primitives for ECS/EKS/CloudFormation/Route53.

## Included

- AWS client factory for ECR, ECS, EC2, EKS, CloudFormation, ELBv2, Application Auto Scaling, Route53.
- ECR image URI and Docker build/login/push command helpers.
- ECS Fargate task definition and service input builders.
- Four-service platform model: auth, catalog, orders, payments.
- ALB target group helpers and Route53 weighted blue/green records.
- CloudFormation VPC/subnet template plus change set/drift helpers.
- EKS IRSA trust policy and Kubernetes service account/deployment manifests.
- ECS target-tracking autoscaling helper.

## Run

```bash
pnpm install
pnpm --filter @floci-lab/phase-06 test
pnpm --filter @floci-lab/phase-06 platform:demo
```

## Production notes

Use ALB for HTTP/gRPC and NLB for raw TCP/UDP. Keep task health check ports aligned with container ports. Use private subnets for tasks, public subnets for ALB. Prefer IRSA over static AWS keys in pods. Use CloudFormation change sets before stack updates and drift detection after manual recovery.
