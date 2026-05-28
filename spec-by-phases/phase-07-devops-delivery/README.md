# Phase 07 - DevOps & Delivery

> **Theme**: CodeBuild, CodeDeploy, CI/CD, blue/green, rollback
> **Difficulty**: 4/5
> **Estimated time**: 2 weeks

## Learning goals
- Define buildspecs for CodeBuild
- Configure CodeDeploy blue/green for ECS and Lambda
- Implement canary deployments
- Wire automated rollback on CloudWatch alarms

## Services covered
- [040 - CodeBuild](../../spec-by-services/040-codebuild/README.md)
- [041 - CodeDeploy](../../spec-by-services/041-codedeploy/README.md)

## Concepts to master
- Deployment strategies: rolling, blue/green, canary
- Lambda aliases and weighted routing
- Hooks: BeforeAllowTraffic, AfterAllowTraffic
- Rollback triggers via alarms

## Mini-projects
- Lambda canary deploy with 10% → 100% shift
- ECS blue/green with smoke tests

## Major real-world project
**Self-Service Deploy Platform** - A pipeline that takes a Git push, builds in CodeBuild, deploys to ECS via CodeDeploy with blue/green, runs smoke tests, and auto-rolls back on alarm.

Lives in: `implementation-by-phases/phase-07-devops-delivery/major-projects/self-service-deploy-platform/`

## Folder structure
```
implementation-by-phases/phase-07-devops-delivery/
├── README.md
├── package.json
├── src/
├── tests/
└── major-projects/
    └── self-service-deploy-platform/
```

## Codex CLI prompt
See `prompts/phases/phase-07.md`.

## Acceptance criteria
- All service folders for this phase have green tests.
- The major project runs end-to-end against Floci.
- Documentation is complete.

## Tests to run
```bash
docker compose up -d
cd implementation-by-spec/040-codebuild && pnpm test && cd -
cd implementation-by-spec/041-codedeploy && pnpm test && cd -
cd implementation-by-phases/phase-07-devops-delivery && pnpm test
```

## Common bugs to debug
- Buildspec env vars not interpolating
- CodeDeploy hooks timing out
- Forgotten alarms → no rollback trigger

## What a real production version would add
Production adds progressive delivery (LaunchDarkly/Flagger), deployment freezes, and audit trails.

## Recommended order
Complete services in the order listed under 'Services covered' before tackling the major project.
