# 011 - STS

Short-lived AWS credentials for secure enterprise access: caller identity, cross-account AssumeRole, federation tokens, scoped session policies, external IDs, expiry checks, audit events, refresh plans, and retry guidance.

## Quick start

```bash
docker compose up -d
pnpm install
cd implementation-by-spec/011-sts
pnpm setup
pnpm seed
pnpm test
pnpm cleanup
```

## Module map

- `src/client.ts` - STS SDK v3 client for Floci (`http://localhost:4566`).
- `src/use-cases/credentials.ts` - all STS helpers and function-level examples.
- `src/examples/` - hands-on enterprise scenarios.
- `scripts/` - setup, seed, cleanup lab commands.

## Functions covered

| Function | Purpose | Practical use |
|---|---|---|
| `getCallerIdentity` | Returns current account, ARN, user ID. | Verify CI/developer identity before touching AWS. |
| `assumeRole` | Gets short-lived role credentials. | Cross-account deploy, vendor access, break-glass access. |
| `assumeRoleSession` | Adds session metadata, expiry health, safe summary. | Worker/deploy pipeline logs credential health without secrets. |
| `getFederationToken` | Issues scoped federated credentials. | Temporary read-only reporting portal access. |
| `credentialsExpireSoon` | Detects missing or near-expiry credentials. | Refresh before long jobs or retries. |
| `summarizeCredentials` | Logs access key ID, expiry, TTL only. | Observability without leaking secret/token. |
| `assertCredentialsFresh` | Fails fast when TTL is too short. | Stop DR restore or data export before mid-flight expiry. |
| `validateRoleSessionName` | Validates AWS-supported session names. | Clean CloudTrail attribution by ticket/actor. |
| `buildScopedSessionPolicy` | Creates least-privilege inline policy JSON. | Restrict assumed role to one tenant prefix/table/action set. |
| `createExternalId` | Builds tenant-safe external ID. | Prevent confused-deputy risk for third-party role assumption. |
| `createStsAuditEvent` | Creates SIEM/EventBridge-ready audit record. | Track actor, target role, ticket, outcome, reason. |
| `planCredentialRefresh` | Calculates refresh timing and workload safety. | Long-running workers and data lifecycle jobs. |
| `createStsRetryPlan` | Standard retry/backoff plan. | Retry throttling, not authorization failures. |

## Enterprise examples

Run any file with `pnpm tsx src/examples/<file>.ts`.

- `whoami.ts` - print current caller identity.
- `assume-role-session.ts` - basic AssumeRole with expiry metadata.
- `credential-summary.ts` - safe credential logging pattern.
- `cross-account-deploy-access.ts` - CI/CD deploy role with external ID, scoped policy, audit event, refresh plan.
- `tenant-data-export.ts` - tenant-scoped S3/KMS export access with retries and data lifecycle safety.
- `event-driven-processing.ts` - EventBridge/Lambda worker credential health and retry profile.
- `compliance-access-review.ts` - read-only auditor access with evidence policy and GRC ticket.
- `disaster-recovery-break-glass.ts` - DR session TTL validation, conservative retry, break-glass audit.

## Minimal use

```ts
import {
  assumeRoleSession,
  buildScopedSessionPolicy,
  createExternalId,
  createStsAuditEvent,
  assertCredentialsFresh,
} from "./src/index.js";

const policy = buildScopedSessionPolicy([
  { effect: "Allow", actions: ["s3:GetObject"], resources: ["arn:aws:s3:::tenant-data/acme/*"] },
]);

const session = await assumeRoleSession("arn:aws:iam::111122223333:role/tenant-reader", "acme-reader", 900, undefined, {
  externalId: createExternalId("acme", "data-read"),
  sourceIdentity: "report-worker",
  sessionPolicy: policy,
});

assertCredentialsFresh(session.credentials, 300_000);
console.log(session.summary);
console.log(createStsAuditEvent({ operation: "AssumeRole", actor: "report-worker", targetArn: session.roleArn, sessionName: session.sessionName, outcome: "ALLOW" }));
```

## Runbook

1. Start Floci: `docker compose up -d`.
2. Check health: `pnpm run floci:health` from repo root.
3. Run `pnpm setup` for identity check.
4. Use examples in `src/examples/` to learn safe enterprise patterns.
5. Run `pnpm test` before changes.
6. Run `pnpm cleanup` when done.

## Gotchas

- Never log or persist `SecretAccessKey` or `SessionToken`; use `summarizeCredentials`.
- Keep durations short and refresh before retry-heavy work.
- Role trust policy controls who may assume; session policy can only reduce permissions.
- Use external IDs for third-party or central-platform access.
- Use meaningful session names/source identity for CloudTrail attribution.
- Do not retry `AccessDenied`; fix trust policy, permissions, MFA, or external ID.

## Floci vs Real AWS

Floci support is **partial**. Real AWS needs IAM trust policies, external IDs, session tags, max session duration, MFA conditions, CloudTrail/CloudWatch audit, regional STS endpoint choices, AWS Organizations controls, and eventual-consistency handling.
