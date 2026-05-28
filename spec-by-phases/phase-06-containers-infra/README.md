# Phase 06 - Containers & Infrastructure

> **Theme**: ECR, ECS, EKS, EC2, ELB v2, ASG, Route53, CloudFormation
> **Difficulty**: 4/5
> **Estimated time**: 3 weeks

## Learning goals
- Build and push images to ECR
- Run services on ECS Fargate behind an ALB
- Deploy to EKS with IRSA
- Provision infra with CloudFormation templates
- Route DNS with Route53 + health checks

## Services covered
- [027 - ECR](../../spec-by-services/027-ecr/README.md)
- [028 - ECS](../../spec-by-services/028-ecs/README.md)
- [029 - EC2](../../spec-by-services/029-ec2/README.md)
- [030 - EKS](../../spec-by-services/030-eks/README.md)
- [035 - CloudFormation](../../spec-by-services/035-cloudformation/README.md)
- [037 - ELB v2 (ALB/NLB)](../../spec-by-services/037-elb-v2/README.md)
- [038 - Auto Scaling](../../spec-by-services/038-auto-scaling/README.md)
- [039 - Route53](../../spec-by-services/039-route53/README.md)

## Concepts to master
- Task definitions, services, target groups
- ALB vs NLB vs API Gateway
- EKS pod identity (IRSA)
- CloudFormation stacks, change sets, drift
- Route53 routing policies (weighted, latency, failover)

## Mini-projects
- ECS Fargate Node service with ALB + autoscaling
- EKS deployment with IRSA accessing S3
- CloudFormation template for a VPC + subnets

## Major real-world project
**Microservices Platform on ECS** - A multi-service backend (auth, catalog, orders, payments) on ECS Fargate behind an ALB, with service discovery, CloudFormation IaC, and blue/green deploys.

Lives in: `implementation-by-phases/phase-06-containers-infra/major-projects/microservices-platform-on-ecs/`

## Folder structure
```
implementation-by-phases/phase-06-containers-infra/
├── README.md
├── package.json
├── src/
├── tests/
└── major-projects/
    └── microservices-platform-on-ecs/
```

## Codex CLI prompt
See `prompts/phases/phase-06.md`.

## Acceptance criteria
- All service folders for this phase have green tests.
- The major project runs end-to-end against Floci.
- Documentation is complete.

## Tests to run
```bash
docker compose up -d
cd implementation-by-spec/027-ecr && pnpm test && cd -
cd implementation-by-spec/028-ecs && pnpm test && cd -
cd implementation-by-spec/029-ec2 && pnpm test && cd -
cd implementation-by-spec/030-eks && pnpm test && cd -
cd implementation-by-spec/035-cloudformation && pnpm test && cd -
cd implementation-by-spec/037-elb-v2 && pnpm test && cd -
cd implementation-by-spec/038-auto-scaling && pnpm test && cd -
cd implementation-by-spec/039-route53 && pnpm test && cd -
cd implementation-by-phases/phase-06-containers-infra && pnpm test
```

## Common bugs to debug
- Task fails health check due to wrong port
- IRSA role missing trust policy for OIDC provider
- CloudFormation stuck in UPDATE_ROLLBACK_FAILED

## What a real production version would add
Production adds service mesh (App Mesh / Istio), pod disruption budgets, and chaos engineering.

## Recommended order
Complete services in the order listed under 'Services covered' before tackling the major project.
