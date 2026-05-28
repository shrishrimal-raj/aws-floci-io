# Project 007 - Containerized Microservices Platform

## Business scenario
Run 5 Node services (auth, catalog, orders, payments, notifications) on ECS Fargate with shared ALB.

## AWS services used
- ECR
- ECS Fargate
- ELB v2
- Route53
- CloudWatch

## Architecture
- Each service in its own ECR repo + ECS service
- ALB with path-based routing
- Service discovery via Cloud Map
- Route53 alias to ALB

## API design
TBD - designed in the implementation phase.

## Data model
Service-owned datastores; no shared DBs

## Event flow
Inter-service via EventBridge; sync via internal ALB

## Error handling strategy
ALB health checks, ECS circuit breaker on deploy

## Testing strategy
docker compose locally; integration tests across services

## Security model
Each service has its own task role; secrets via Secrets Manager

## Observability model
Container Insights, ALB access logs

## Local Floci setup
```bash
docker compose up -d
cd implementation-by-phases/phase-10-capstone/projects/007-containerized-microservices-platform
pnpm install
pnpm setup
pnpm dev
```

## Codex CLI prompt
See `prompts/projects/007-containerized-microservices-platform.md`.

## Acceptance criteria
- End-to-end happy path works against Floci.
- Tests cover >=80% of business logic.
- Security model enforced (auth + IAM + encryption where applicable).
- Observability: logs + metrics + at least one alarm.
- Documentation includes runbook + architecture diagram.
