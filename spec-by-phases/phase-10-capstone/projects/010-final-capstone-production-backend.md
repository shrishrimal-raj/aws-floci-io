# Project 010 - Final Enterprise-Grade Backend

## Business scenario
Build a complete SaaS — e.g. a B2B analytics product — using everything learned. Multi-region ready, multi-tenant, observable, cost-optimized.

## AWS services used
- 20+ services integrated

## Architecture
- Edge: CloudFront + WAF + Route53
- API: API Gateway + Lambda + Cognito
- Async: EventBridge + Step Functions + SQS
- Data: DynamoDB + RDS + OpenSearch + S3 data lake
- ML: Bedrock for insights
- Ops: CW + Config + Backup + Cost Explorer
- Delivery: CodeBuild + CodeDeploy + CloudFormation

## API design
TBD - designed in the implementation phase.

## Data model
Hybrid: DDB for hot, RDS for transactional, S3+Athena for analytics

## Event flow
Domain-driven events on EventBridge, schema-registered

## Error handling strategy
Defense in depth: DLQs, circuit breakers, fallback paths

## Testing strategy
Vitest + Testcontainers + k6 load + chaos

## Security model
Zero-trust, KMS everywhere, IAM least-privilege, SCP guardrails

## Observability model
SLO/error-budget dashboards, distributed tracing, cost-per-tenant

## Local Floci setup
```bash
docker compose up -d
cd implementation-by-phases/phase-10-capstone/projects/010-final-capstone-production-backend
pnpm install
pnpm setup
pnpm dev
```

## Codex CLI prompt
See `prompts/projects/010-final-capstone-production-backend.md`.

## Acceptance criteria
- End-to-end happy path works against Floci.
- Tests cover >=80% of business logic.
- Security model enforced (auth + IAM + encryption where applicable).
- Observability: logs + metrics + at least one alarm.
- Documentation includes runbook + architecture diagram.
