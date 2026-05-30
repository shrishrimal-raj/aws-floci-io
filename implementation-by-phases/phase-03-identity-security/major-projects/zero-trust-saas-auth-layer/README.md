# Zero-Trust SaaS Auth Layer

Enterprise identity/security learning project for Phase 03.

## Scenarios

- Cognito MFA tenant identity plan and user onboarding.
- JWT verification, tenant boundary enforcement, and role authorization.
- Least-privilege IAM policy generation and explicit deny guardrails.
- KMS tenant-bound secret encryption and rotation decisions.
- STS ExternalId cross-account access with redacted credential logging.
- ACM DNS certificate request for tenant custom domains.
- Audit logging, claim redaction, compliance lifecycle decisions.

## Run

```bash
pnpm --filter @floci-lab/phase-03 auth:demo
pnpm --filter @floci-lab/phase-03 auth:enterprise
```

`auth:demo` prints client wiring and policy examples. `auth:enterprise` runs full local zero-trust platform flow.

## Learn by file

- `src/demo.ts` - quick clients, Cognito plan, IAM and trust policy tour.
- `src/scenarios/enterprise-zero-trust-platform.ts` - secure authorizer, IAM review, KMS lifecycle, cross-account compliance.
- `../../src/examples/` - focused reusable examples for enterprise auth/security patterns.

Full Floci e2e can wire Cognito users, IAM policies, KMS keys, STS roles, and ACM certificate requests.
