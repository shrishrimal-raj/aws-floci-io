# Phase 03 - Identity, Security, Production Readiness

> **Theme**: IAM, STS, Cognito, KMS, ACM, least privilege
> **Difficulty**: 3/5
> **Estimated time**: 2 weeks

## Learning goals
- Write least-privilege IAM policies from scratch
- Use STS AssumeRole for cross-account and service-to-service
- Authenticate users with Cognito User Pools + verify JWTs
- Encrypt data with KMS envelope encryption
- Manage TLS certificates with ACM

## Services covered
- [009 - Cognito](../../spec-by-services/009-cognito/README.md)
- [010 - IAM](../../spec-by-services/010-iam/README.md)
- [011 - STS](../../spec-by-services/011-sts/README.md)
- [012 - KMS](../../spec-by-services/012-kms/README.md)
- [036 - ACM](../../spec-by-services/036-acm/README.md)

## Concepts to master
- Policy evaluation logic (explicit deny > allow)
- Trust policies vs identity policies vs resource policies
- Cognito User Pool vs Identity Pool
- JWT verification via JWKS endpoints
- KMS data keys vs CMKs, encryption context

## Mini-projects
- JWT auth middleware verifying Cognito tokens
- KMS-encrypted secret store
- Cross-account role assumption for analytics

## Major real-world project
**Zero-Trust SaaS Auth Layer** - A reusable auth package for multi-tenant SaaS: Cognito User Pool with custom attributes, hosted UI fallback, JWT verification middleware, per-tenant KMS keys, and audit logs.

Lives in: `implementation-by-phases/phase-03-identity-security/major-projects/zero-trust-saas-auth-layer/`

## Folder structure
```
implementation-by-phases/phase-03-identity-security/
├── README.md
├── package.json
├── src/
├── tests/
└── major-projects/
    └── zero-trust-saas-auth-layer/
```

## Codex CLI prompt
See `prompts/phases/phase-03.md`.

## Acceptance criteria
- All service folders for this phase have green tests.
- The major project runs end-to-end against Floci.
- Documentation is complete.

## Tests to run
```bash
docker compose up -d
cd implementation-by-spec/009-cognito && pnpm test && cd -
cd implementation-by-spec/010-iam && pnpm test && cd -
cd implementation-by-spec/011-sts && pnpm test && cd -
cd implementation-by-spec/012-kms && pnpm test && cd -
cd implementation-by-spec/036-acm && pnpm test && cd -
cd implementation-by-phases/phase-03-identity-security && pnpm test
```

## Common bugs to debug
- Forgetting to verify JWT `aud` claim
- IAM policy granting `*` on resources
- KMS key region mismatch

## What a real production version would add
Production adds MFA enforcement, session anomaly detection, key rotation schedules, and SCP guardrails at the org level.

## Recommended order
Complete services in the order listed under 'Services covered' before tackling the major project.
