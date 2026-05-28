# Codex CLI - Phase 0 Foundation Setup

Set up the monorepo skeleton for the AWS + Floci mastery project.

## Steps
1. Create root `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `eslint.config.js`, `.env.example`, `.gitignore`, `docker-compose.yml`.
2. Create the `shared/` workspace packages: `aws-clients`, `logger`, `config`, `errors`, `test-utils`. Each is a typed TS package.
3. Create root `scripts/` for health-check, wait-for-floci, start-floci, reset-floci.
4. Run `pnpm install`, `docker compose up -d`, `pnpm run floci:health`.

## Acceptance criteria
- `pnpm run floci:health` prints 'Floci is healthy'.
- `pnpm -r build` succeeds (after services are added).
- `awsDefaults()` returns config pointing to Floci when `AWS_ENDPOINT_URL` is set.

## Files to create
Use the files listed in the repository layout in the root README.md.
