# Project 005 - Authenticated SaaS Backend

## Business scenario
Multi-tenant SaaS with role-based access, row-level isolation in Postgres, per-tenant KMS keys.

## AWS services used
- Cognito
- API Gateway
- Lambda
- RDS Postgres
- KMS

## Architecture
- Cognito User Pool with custom attributes (tenantId, role)
- API GW JWT authorizer
- Lambda → RDS Proxy → Postgres with RLS policies
- Sensitive columns encrypted with per-tenant KMS data keys

## API design
TBD - designed in the implementation phase.

## Data model
Postgres with RLS: USING (tenant_id = current_setting('app.tenant_id')::uuid)

## Event flow
User signs up → post-confirm trigger → provisions tenant row + KMS data key

## Error handling strategy
Connection pool exhaustion → 503 with Retry-After

## Testing strategy
Vitest + Testcontainers Postgres + Floci Cognito

## Security model
RLS enforced at DB; KMS encryption context binds key to tenant

## Observability model
Per-tenant query latency histogram

## Local Floci setup
```bash
docker compose up -d
cd implementation-by-phases/phase-10-capstone/projects/005-authenticated-saas-api
pnpm install
pnpm setup
pnpm dev
```

## Codex CLI prompt
See `prompts/projects/005-authenticated-saas-api.md`.

## Acceptance criteria
- End-to-end happy path works against Floci.
- Tests cover >=80% of business logic.
- Security model enforced (auth + IAM + encryption where applicable).
- Observability: logs + metrics + at least one alarm.
- Documentation includes runbook + architecture diagram.
