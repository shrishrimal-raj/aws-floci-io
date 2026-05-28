# Codex CLI task - Secrets Manager

You are completing the `implementation-by-spec/013-secrets-manager/` folder for an AWS + Floci learning monorepo.

## Context
- Node.js 20, TypeScript strict, pnpm workspaces.
- AWS SDK v3 only. Client already wired to Floci via `@floci-lab/aws-clients`.
- Floci runs at `http://localhost:4566` via the root `docker-compose.yml`.
- Tests use Vitest + the `@floci-lab/test-utils` `waitForFloci` helper.

## Implement
1. **`src/examples/`** - three minimal runnable scripts demonstrating the most common operations.
2. **`src/use-cases/`** - at least two production patterns specific to Secrets Manager.
3. **`tests/`** - integration tests covering each example + use-case, including 2 error paths.
4. **`scripts/setup.ts`** - provision any required Floci resources.
5. **`scripts/seed.ts`** - load realistic fixture data.
6. **`scripts/cleanup.ts`** - tear down everything created.

## Acceptance criteria
- `pnpm setup && pnpm test && pnpm cleanup` passes on a fresh Floci.
- Every public function has a JSDoc with at least one example.
- No `any` types.
- Tests run in <30s.
- README is updated with operations, gotchas, and Floci-vs-AWS deltas.

## Commands
```bash
docker compose up -d
pnpm install
cd implementation-by-spec/013-secrets-manager
pnpm setup
pnpm test
```

## Expected output
- All tests green.
- `pnpm cleanup` removes every resource it created.
