# Phase 00 - Foundation

> **Theme**: AWS mental model + Floci + SDK v3 + shared infra
> **Difficulty**: 1/5
> **Estimated time**: 1 week

## Learning goals
- Understand AWS mental model: regions, AZs, accounts, IAM, ARNs
- Run Floci locally via Docker Compose
- Build a shared AWS SDK v3 client factory that auto-targets Floci
- Set up Vitest + Testcontainers + pino logger conventions
- Establish local dev conventions used across all 51 services

## Services covered
_See phase description._

## Concepts to master
- AWS Regions vs Availability Zones
- AWS Account boundaries and the root user
- ARN structure: arn:partition:service:region:account:resource
- IAM users, roles, policies, principals
- SDK v3 modular packages and middleware
- Endpoint override pattern for local emulators
- Dummy credentials for local dev (test/test)

## Mini-projects
- Health check script that pings Floci and lists registered services
- Shared `createClient(service)` factory with endpoint override + retry

## Major real-world project
**Floci Lab Bench** - A CLI tool that boots Floci, waits for readiness, runs smoke tests across S3, SQS, DynamoDB, and prints a green/red status board. Used as the team's local dev verification tool.

Lives in: `implementation-by-phases/phase-00-foundation/major-projects/floci-lab-bench/`

## Folder structure
```
implementation-by-phases/phase-00-foundation/
├── README.md
├── package.json
├── src/
├── tests/
└── major-projects/
    └── floci-lab-bench/
```

## Codex CLI prompt
See `prompts/phases/phase-00.md`.

## Acceptance criteria
- All service folders for this phase have green tests.
- The major project runs end-to-end against Floci.
- Documentation is complete.

## Tests to run
```bash
docker compose up -d

cd implementation-by-phases/phase-00-foundation && pnpm test
```

## Common bugs to debug
- Forgetting to set AWS_ENDPOINT_URL → SDK hits real AWS
- Forgetting dummy credentials → SDK throws CredentialsProviderError
- Running Floci on a port already taken by LocalStack

## What a real production version would add
Real production uses IAM roles via STS AssumeRole, IRSA on EKS, or instance profiles on EC2 — never static credentials.

## Recommended order
Complete services in the order listed under 'Services covered' before tackling the major project.
