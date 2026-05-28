# Codex CLI - Final Integration

Wire all 51 services and 10 capstone projects into a cohesive monorepo.

## Goals
1. Ensure every service in `implementation-by-spec/` builds and tests green.
2. Ensure every phase in `implementation-by-phases/` builds and tests green.
3. Ensure every capstone project boots against Floci.
4. Add a root `pnpm test` that runs everything in parallel where safe.
5. Generate a top-level architecture diagram (Mermaid) showing how services connect.

## Acceptance criteria
- `pnpm -r test` passes with Floci running.
- `docker compose up -d && pnpm run floci:health` is idempotent.
- Every package README links back to the root.
- A `STATUS.md` file lists the green/red status per package.
