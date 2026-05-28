# Project 001 - Object Storage API

## Business scenario
A SaaS needs to let users upload, list, and share files with signed URLs and per-tenant isolation.

## AWS services used
- S3
- CloudFront
- IAM
- Cognito

## Architecture
- Client → API Gateway → Lambda (Cognito-authorized)
- Lambda issues S3 presigned PUT/GET URLs scoped to /tenant/{tenantId}/
- CloudFront fronts read traffic with signed cookies
- Audit events flow to CloudWatch Logs

## API design
TBD - designed in the implementation phase.

## Data model
DynamoDB Files table: PK=TENANT#{id}, SK=FILE#{id}, attrs: key, mime, size, uploaderId, createdAt

## Event flow
Upload → S3 → S3 Event → Lambda (virus scan stub) → DDB update → SNS notification

## Error handling strategy
DLQ for scan failures, idempotent upload IDs

## Testing strategy
Vitest + Floci; verify presigned URL works, tenant isolation enforced

## Security model
Cognito JWT, IAM scope-down via session policies, S3 bucket policy denies non-TLS

## Observability model
Structured logs, custom metric: uploads_per_tenant

## Local Floci setup
```bash
docker compose up -d
cd implementation-by-phases/phase-10-capstone/projects/001-basic-object-storage-api
pnpm install
pnpm setup
pnpm dev
```

## Codex CLI prompt
See `prompts/projects/001-basic-object-storage-api.md`.

## Acceptance criteria
- End-to-end happy path works against Floci.
- Tests cover >=80% of business logic.
- Security model enforced (auth + IAM + encryption where applicable).
- Observability: logs + metrics + at least one alarm.
- Documentation includes runbook + architecture diagram.
