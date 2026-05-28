# Codex CLI - Phase 00: Foundation

Implement the full phase as described in `spec-by-phases/phase-00-foundation/README.md`.

## Constraints
- TypeScript strict, Node.js 20, pnpm workspaces.
- AWS SDK v3 only.
- Everything must run against Floci locally.

## Deliverables
1. Fully implement every service folder listed under 'Services covered'.
2. Build the major project: **Floci Lab Bench**.
3. End-to-end tests for the major project.
4. README per service + major project with runbook.

## Acceptance criteria
- `pnpm -r test` passes for every package in this phase.
- Major project boots and serves traffic against Floci.
- No `any` types. All public functions JSDoc'd.
