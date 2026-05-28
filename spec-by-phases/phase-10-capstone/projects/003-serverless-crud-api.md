# Project 003 - Serverless CRUD API

## Business scenario
A team-collaboration tool needs a fast multi-tenant CRUD API for projects + tasks.

## AWS services used
- API Gateway v2
- Lambda
- DynamoDB
- Cognito

## Architecture
- HTTP API (v2) → Lambda → DynamoDB single-table
- Cognito JWT authorizer
- powertools-typescript for tracing + metrics

## API design
TBD - designed in the implementation phase.

## Data model
Single table: PK=TENANT#{id}, SK varies (PROJECT#{id} | TASK#{id}). GSI1 for by-assignee queries.

## Event flow
Standard CRUD; OnDelete cleans related items via TransactWrite

## Error handling strategy
Zod validation; 4xx with problem+json

## Testing strategy
Vitest + supertest; happy path + auth failure + validation failure

## Security model
Tenant from JWT claim; never trust client tenant id

## Observability model
X-Ray traces, cold-start metric

## Local Floci setup
```bash
docker compose up -d
cd implementation-by-phases/phase-10-capstone/projects/003-serverless-crud-api
pnpm install
pnpm setup
pnpm dev
```

## Codex CLI prompt
See `prompts/projects/003-serverless-crud-api.md`.

## Acceptance criteria
- End-to-end happy path works against Floci.
- Tests cover >=80% of business logic.
- Security model enforced (auth + IAM + encryption where applicable).
- Observability: logs + metrics + at least one alarm.
- Documentation includes runbook + architecture diagram.
