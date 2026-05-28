# Codex CLI - Project 004: Event-Driven Ecommerce Backend

Build the project described in `spec-by-phases/phase-10-capstone/projects/004-event-driven-ecommerce-backend.md`.

## Constraints
- TypeScript strict, Node.js 20, pnpm workspaces.
- AWS SDK v3 only. Everything must run against Floci locally.
- Use the shared packages: `@floci-lab/aws-clients`, `@floci-lab/logger`, `@floci-lab/errors`, `@floci-lab/test-utils`.
- Vitest for tests. Testcontainers when an external engine is needed (Postgres, Redis, OpenSearch).

## Deliverables
1. `src/` with the full implementation.
2. `tests/` integration + e2e.
3. `scripts/setup.ts` provisions every Floci resource.
4. `scripts/seed.ts` loads realistic data.
5. `README.md` with architecture diagram (ASCII) + runbook.
6. `openapi.yaml` if the project exposes a REST API.

## Acceptance criteria
- `pnpm setup && pnpm test` passes.
- Happy-path demo script runs in <2 minutes.
- Failure injection tests pass (one per critical path).
- Security: no hard-coded creds, IAM scoped policies documented in `SECURITY.md`.
- Observability: pino logs in JSON, one CloudWatch custom metric, one alarm.
