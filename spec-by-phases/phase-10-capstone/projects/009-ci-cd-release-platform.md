# Project 009 - CI/CD Deployment Platform

## Business scenario
Self-service deploy platform: developers push to Git, get a preview env, promote to prod with blue/green.

## AWS services used
- CodeBuild
- CodeDeploy
- ECR
- ECS
- CloudFormation

## Architecture
- GitHub webhook → API GW → Lambda → CodeBuild
- CodeBuild → ECR push → CodeDeploy blue/green to ECS
- Preview envs via per-branch CloudFormation stack

## API design
TBD - designed in the implementation phase.

## Data model
Deployments table tracking status, commit, env

## Event flow
PR opened → preview deployed; PR merged → prod deploy with canary

## Error handling strategy
Auto-rollback on CW alarm during canary window

## Testing strategy
Vitest for the orchestrator; e2e: synthetic Git push

## Security model
CodeBuild has narrow ECR push role; cross-account deploy via STS

## Observability model
Deploy duration metric, success rate, MTTR

## Local Floci setup
```bash
docker compose up -d
cd implementation-by-phases/phase-10-capstone/projects/009-ci-cd-release-platform
pnpm install
pnpm setup
pnpm dev
```

## Codex CLI prompt
See `prompts/projects/009-ci-cd-release-platform.md`.

## Acceptance criteria
- End-to-end happy path works against Floci.
- Tests cover >=80% of business logic.
- Security model enforced (auth + IAM + encryption where applicable).
- Observability: logs + metrics + at least one alarm.
- Documentation includes runbook + architecture diagram.
