# Phase 03 - Identity, Security, Production Readiness

Zero-Trust SaaS Auth Layer teaches identity, authorization, encryption, cross-account access, and production security patterns.

## What you learn

- **Cognito**: MFA-first user pool plan, app client creation, tenant custom attributes, and user invitations.
- **JWT auth**: decode tokens, verify RS256 signatures, validate issuer/audience/expiry/token use, and build tenant auth context.
- **Authorization**: tenant boundary checks, role checks, allow/deny audit events, and claim redaction.
- **IAM**: tenant-scoped DynamoDB/S3 policies, ExternalId trust policies, explicit deny guardrails, and overbroad policy detection.
- **KMS**: JSON secret encryption, tenant encryption context, envelope data keys, and redacted secret logging.
- **STS + ACM**: cross-account AssumeRole with tenant tags, redacted temporary credentials, and DNS-validated certificates.
- **Lifecycle**: secret rotation and inactive-user disable decisions for compliance and operations.

## Run

```bash
pnpm install
pnpm --filter @floci-lab/phase-03 typecheck
pnpm --filter @floci-lab/phase-03 test
pnpm --filter @floci-lab/phase-03 auth:demo
pnpm --filter @floci-lab/phase-03 auth:enterprise
```

## Key files

- `src/cognito.ts` - User Pool plan, app client creation, tenant user invite.
- `src/jwt-auth.ts` - JWT decode, RS256 verification, claim checks, auth context.
- `src/iam-policy.ts` - least-privilege policies, trust policy, evaluator, guardrails.
- `src/kms-secret-store.ts` - KMS JSON encryption, decrypt, envelope key, redaction.
- `src/sts-acm-audit.ts` - STS AssumeRole, ACM certificate request, audit events.
- `src/enterprise-patterns.ts` - tenant authorization, role checks, redaction, lifecycle decisions.
- `src/examples/` - focused real-world identity/security examples.
- `major-projects/zero-trust-saas-auth-layer/` - full enterprise zero-trust scenario.

## Architecture

1. Cognito issues MFA-protected JWTs with tenant and role custom claims.
2. Authorizer verifies signature and claims, then enforces tenant boundary.
3. IAM policy restricts DynamoDB and S3 access to tenant-specific resources.
4. KMS encryption context binds secrets to tenant and purpose.
5. STS ExternalId enables safe cross-account tenant analytics/export jobs.
6. ACM provisions tenant custom-domain certificates with DNS validation.
7. Audit logs store allow/deny decisions and redacted security metadata.
8. Lifecycle jobs rotate old secrets and disable inactive users.

## Floci notes

Examples run locally without live AWS calls unless you wire real clients. Full Floci e2e can provision Cognito, IAM, KMS, STS, and ACM-compatible resources where supported.
