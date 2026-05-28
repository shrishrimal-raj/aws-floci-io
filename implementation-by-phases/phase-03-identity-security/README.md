# Phase 03 - Identity, Security, Production Readiness implementation

Zero-trust auth/security layer for multi-tenant SaaS.

## Included

- Cognito User Pool plan with MFA, hosted UI fallback, custom tenant attributes.
- JWT helpers: decode, RS256 signature verify, issuer/audience/expiry/token_use/tenant checks.
- Least-privilege IAM policy builders and policy evaluator.
- STS cross-account AssumeRole with ExternalId and tenant session tag.
- KMS encrypted secret store using encryption context and envelope data-key helper.
- ACM DNS certificate request helper.
- Audit event model.

## Run

```bash
pnpm install
pnpm --filter @floci-lab/phase-03 test
pnpm --filter @floci-lab/phase-03 auth:demo
```

## Production notes

Policy evaluation favors explicit deny over allow. Cognito tokens must verify signature and claims, especially `aud`/`client_id`, `iss`, `exp`, `token_use`, and tenant custom claim. KMS encryption context binds ciphertext to tenant/purpose. STS trust policies require ExternalId for cross-account tenant isolation.
