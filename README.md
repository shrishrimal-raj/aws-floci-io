# AWS + Node.js + Floci Mastery

A 6-12 month, code-first roadmap to take a senior Node.js backend engineer from zero AWS knowledge to world-class AWS backend engineer, using Floci as a local AWS emulator.

## Quick start

```bash
pnpm install
docker compose up -d
pnpm run floci:health
cd implementation-by-spec/001-s3 && pnpm test
```

## Layout

- `spec-by-phases/` - Phase markdown specs (Phase 0 -> 10)
- `implementation-by-phases/` - Runnable code per phase + major-projects
- `spec-by-services/` - One markdown spec per AWS service (51 services)
- `implementation-by-spec/` - Runnable mini-package per AWS service
- `prompts/` - Codex CLI prompts for every phase, service, and project
- `shared/` - Shared TypeScript packages: aws-clients, config, logger, test-utils, errors
- `scripts/` - Root scripts (start-floci, wait-for-floci, reset-floci, health-check)

## Phases

- **Phase 00 - Foundation** (1 week, difficulty 1/5)
- **Phase 01 - Core Backend Services** (3 weeks, difficulty 2/5)
- **Phase 02 - Real Backend Patterns** (3 weeks, difficulty 3/5)
- **Phase 03 - Identity, Security, Production Readiness** (2 weeks, difficulty 3/5)
- **Phase 04 - Advanced Serverless & Event Systems** (3 weeks, difficulty 4/5)
- **Phase 05 - Databases, Search, Cache, Analytics** (3 weeks, difficulty 4/5)
- **Phase 06 - Containers & Infrastructure** (3 weeks, difficulty 4/5)
- **Phase 07 - DevOps & Delivery** (2 weeks, difficulty 4/5)
- **Phase 08 - Observability, Operations, Cost** (2 weeks, difficulty 3/5)
- **Phase 09 - AI, Documents, Specialized Services** (2 weeks, difficulty 4/5)
- **Phase 10 - Capstone Projects** (8–12 weeks, difficulty 5/5)

## Capstone Projects (Phase 10)

1. **Object Storage API** - S3, CloudFront, IAM, Cognito
2. **Queue-Based Order Processing System** - SQS, SNS, Lambda, DynamoDB
3. **Serverless CRUD API** - API Gateway v2, Lambda, DynamoDB, Cognito
4. **Event-Driven Ecommerce Backend** - EventBridge, Step Functions, SQS, DynamoDB, SES
5. **Authenticated SaaS Backend** - Cognito, API Gateway, Lambda, RDS Postgres, KMS
6. **Data Ingestion & Analytics Platform** - Kinesis, Firehose, S3, Glue, Athena
7. **Containerized Microservices Platform** - ECR, ECS Fargate, ELB v2, Route53, CloudWatch
8. **Search & Recommendation Backend** - OpenSearch, DynamoDB, Lambda, Bedrock
9. **CI/CD Deployment Platform** - CodeBuild, CodeDeploy, ECR, ECS, CloudFormation
10. **Final Enterprise-Grade Backend** - 20+ services integrated

## Floci vs Real AWS

Floci emulates 51 AWS services with high parity. Each service spec calls out where it differs from real AWS. See README.md in each spec-by-services/XXX-*/ folder.

## License

MIT
