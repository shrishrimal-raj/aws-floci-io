# Zero-Trust SaaS Auth Layer

Reusable identity/security package for multi-tenant SaaS.

## Capabilities

- Cognito User Pool + app client provisioning plan.
- Custom tenant attributes and MFA posture.
- JWT middleware primitives for Cognito tokens.
- Tenant-scoped least-privilege IAM policy generation.
- Cross-account analytics access via STS ExternalId.
- Per-tenant KMS encryption context for secrets.
- ACM DNS certificate request helper.
- Audit event model for allow/deny decisions.

## Demo

```bash
pnpm --filter @floci-lab/phase-03 auth:demo
```
