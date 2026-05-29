# 009 - Cognito

Cognito Identity Provider lab for Floci/local AWS: user pools, app clients, admin users, JWT claim helpers, safe audit events, retries, cleanup, and enterprise auth patterns.

## Quick start

```bash
docker compose up -d
pnpm install
cd implementation-by-spec/009-cognito
pnpm setup
pnpm seed
pnpm test
pnpm cleanup
```

Run examples with `pnpm example:basic`, `pnpm example:bundle`, `pnpm example:jwt`, `pnpm example:saas`, `pnpm example:authorizer`, `pnpm example:compliance`, or `pnpm example:observability`.

## What this module teaches

- Create email-based user pools and public app clients.
- Seed/admin-manage users for local labs, migrations, and demos.
- Decode JWT payloads locally and validate token use, expiry, and audience/client ID.
- Build issuer URLs, safe redacted claim logs, and structured auth audit events.
- Use retries and lifecycle helpers so examples/tests do not leak identity resources.
- Map local Cognito patterns to production security, compliance, monitoring, cost, and DR practices.

## Module files

- `src/client.ts` - Cognito Identity Provider SDK v3 client for Floci (`http://localhost:4566`).
- `src/use-cases/user-pools.ts` - user pool/client operations, users, JWT helpers, audit helpers, retries, lifecycle cleanup.
- `src/examples/*` - practical beginner-to-enterprise auth examples.
- `scripts/setup.ts` - creates lab pool/client and writes `.floci-cognito.json`.
- `scripts/seed.ts` - creates fixture users and updates `.floci-cognito.json`.
- `scripts/cleanup.ts` - deletes saved lab pool and removes `.floci-cognito.json`.

## Important functions

| Function | Purpose | Practical use |
|---|---|---|
| `createUserPool` | Create email-based pool with baseline password policy. | App or tenant identity boundary. |
| `createUserPoolClient` | Create public app client. | Browser/mobile login and refresh-token flow. |
| `createUserPoolBundle` | Create pool + client. | Local labs, CI, preview environments. |
| `adminCreateUser` | Create verified user with invitation suppressed. | Fixtures, employee provisioning, migration dry-runs. |
| `createManagedUsers` | Create multiple users with attributes. | Enterprise seed data and tenant onboarding. |
| `adminGetUser` | Read user by username/email. | Support tooling and compliance evidence. |
| `listUsers` | List pool users. | Local verification and small admin reports. |
| `adminDeleteUser` | Idempotent user cleanup. | Teardown and right-to-erasure workflows. |
| `deleteUserPool` | Idempotent pool cleanup. | `finally` blocks, scripts, CI cleanup. |
| `withUserPoolLifecycle` | Create bundle, run workflow, delete pool. | Safe tests and examples. |
| `retryCognitoControlPlane` | Retry transient admin/control-plane work. | Throttling and emulator startup race handling. |
| `buildCognitoIssuerUrl` | Build real AWS issuer URL. | JWT verifier `iss`/JWKS configuration. |
| `decodeJwtPayload` | Decode JWT payload only. | Local tests and learning. |
| `isJwtExpired` | Check `exp`. | API middleware claim checks. |
| `assertJwtClaims` | Require token use and non-expired token. | Access-vs-ID token validation. |
| `assertJwtAudience` | Require matching `client_id`/`aud`. | App-client isolation. |
| `redactJwtClaims` | Keep only safe log fields. | Prevent token/PII leaks. |
| `authAuditEvent` | Build structured auth decision event. | CloudWatch/SIEM/audit pipelines. |

## Examples

| Example | Scenario | Shows |
|---|---|---|
| `basic-user-pool.ts` | Minimal user pool onboarding. | Pool, client, user, list, cleanup. |
| `user-pool-bundle.ts` | Pool/client bundle plus managed users. | Bundle helper, retries, bulk fixture users. |
| `decode-jwt.ts` | Local JWT claim validation. | Decode, token use, audience, redaction, audit event. |
| `enterprise-saas-onboarding.ts` | SaaS tenant onboarding. | Tenant attributes, issuer URL, secure access, audit, cost controls. |
| `api-authorizer-claims.ts` | API authorizer/middleware checks. | Allow/deny flow, audit logging, observability integration. |
| `compliance-user-lifecycle.ts` | Regulated user lifecycle. | Profile evidence, deletion, data lifecycle, DR notes. |
| `observability-security-runbook.ts` | Production readiness runbook. | Metrics, alarms, triggers, cost/quota planning. |

## Production mapping

Floci support is local and partial. For real AWS production, add:

- **Secure access:** verify JWT signature with Cognito JWKS, issuer, audience/client ID, token use, expiry, scopes/groups, MFA/adaptive security where needed.
- **Audit logging:** log auth decisions with request ID, subject, tenant/client, reason; never log raw tokens, passwords, refresh tokens, or secrets.
- **Error handling and retries:** retry throttled admin/control-plane calls with backoff; do not retry invalid credentials or validation failures.
- **Data lifecycle:** store minimal identity attributes, encrypt downstream profile data, coordinate user deletion across DynamoDB/S3/analytics systems.
- **Event-driven processing:** use PreSignUp/PostConfirmation/PreTokenGeneration triggers, EventBridge, SQS DLQs, and replay for provisioning workflows.
- **Monitoring:** alarms for auth failures, token validation failures, admin API errors, SMS/MFA issues, authorizer latency, and trigger failures.
- **Cost optimization:** review MAU/SMS/MFA/trigger costs, avoid unnecessary dedicated pools, block abusive traffic with WAF/API Gateway throttles.
- **Backup/DR:** version IaC for pools/clients/domains/triggers, document recovery steps, rehearse MFA reset and admin break-glass runbooks.
- **Compliance:** retain change records, access evidence, deletion evidence, CloudTrail logs, and policy-approved retention settings.

## Runbook

1. Start Floci: `docker compose up -d`.
2. Check health from repo root: `pnpm run floci:health`.
3. Provision fixture pool/client: `pnpm setup`.
4. Seed fixture users: `pnpm seed`.
5. Run tests: `pnpm test`.
6. Try examples: `pnpm example:saas` and `pnpm example:authorizer`.
7. Cleanup fixture pool and state file: `pnpm cleanup`.

## Gotchas

- `decodeJwtPayload` does **not** verify signatures. Production APIs must verify Cognito JWKS before trusting claims.
- Access tokens, ID tokens, and refresh tokens have different claims and purposes.
- Public app clients must not use stored secrets in browser/mobile apps.
- Admin-created users in real AWS may require password challenge and messaging flows.
- Configure MFA, recovery, callback/logout URLs, hosted UI/domain, token revocation, SES/SMS, triggers, and CloudWatch alarms in production.
- Large production pools need pagination for user listing and careful handling of quotas/throttling.
