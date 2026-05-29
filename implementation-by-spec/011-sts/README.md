# 011 - STS

> Short-lived credentials with caller identity, AssumeRole sessions, federation tokens, expiry checks, and safe credential summaries.

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

## Module

- `src/client.ts` - STS SDK v3 client for Floci (`http://localhost:4566`).
- `src/use-cases/credentials.ts` - caller identity, assume role, federation token, expiry checks, safe summaries.
- `src/examples/whoami.ts` - prints current caller identity.
- `src/examples/assume-role-session.ts` - assumes role and returns expiry metadata.
- `src/examples/credential-summary.ts` - logs safe credential metadata without secrets.
- `scripts/setup.ts` - prepares any lab role dependency.
- `scripts/seed.ts` - exercises identity/session flow.
- `scripts/cleanup.ts` - cleans lab dependencies.

## Operations covered

| Operation | Function | Notes |
|---|---|---|
| Caller identity | `getCallerIdentity` | Returns account, ARN, and user ID for current credentials. |
| Assume role | `assumeRole` | Returns short-lived credentials for trusted role. |
| Assume session | `assumeRoleSession` | Adds role/session metadata and expiry health. |
| Federation token | `getFederationToken` | Gets temporary federated credentials scoped by inline policy. |
| Expiry check | `credentialsExpireSoon` | Detects missing/near expiry credentials. |
| Safe summary | `summarizeCredentials` | Logs access key ID/expiration only; excludes secret/token. |
| Freshness assert | `assertCredentialsFresh` | Fails fast when credentials cannot safely finish work. |

## Use cases

```ts
import { getCallerIdentity, assumeRoleSession, summarizeCredentials, assertCredentialsFresh } from "./src/index.js";

console.log(await getCallerIdentity());
const session = await assumeRoleSession("arn:aws:iam::000000000000:role/app", "worker", 900);
assertCredentialsFresh(session.credentials, 300_000);
console.log(summarizeCredentials(session.credentials));
```

## Runbook

1. Start Floci: `docker compose up -d`.
2. Check health: `pnpm run floci:health` from repo root.
3. Provision role dependency: `pnpm setup`.
4. Exercise identity/session flow: `pnpm seed`.
5. Run tests: `pnpm test`.
6. Cleanup dependencies: `pnpm cleanup`.

## Gotchas

- Never log or persist `SecretAccessKey` or `SessionToken`; log summaries only.
- Refresh credentials before expiry; leave enough TTL for retries and downstream calls.
- Role trust policy controls who may assume; permission policy controls what session may do.
- External IDs prevent confused-deputy issues for third-party role assumption.
- Session names and tags help CloudTrail attribution in real AWS.
- Temporary credentials still need least-privilege scope and short duration.

## Floci vs Real AWS

Floci support: **partial** for this lab. On real AWS, configure IAM role trust policies, external IDs, session tags, max session duration, CloudTrail audit, MFA conditions where needed, and least-privilege session policies. Real AWS also has global/regional STS endpoints, credential provider chain behavior, eventual IAM consistency, service role trust evaluation, and account/organization controls that local Floci does not fully model.
