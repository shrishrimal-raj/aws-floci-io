# 009 - Cognito

> User pools and JWT-based app authentication with app clients, admin user management, local JWT claim helpers, and cleanup flows.

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

## Module

- `src/client.ts` - Cognito Identity Provider SDK v3 client for Floci (`http://localhost:4566`).
- `src/use-cases/user-pools.ts` - user pool/app client creation, admin users, list/get/delete, JWT decoding and claim checks.
- `src/examples/basic-user-pool.ts` - creates pool/client/user and cleans up.
- `src/examples/user-pool-bundle.ts` - creates pool + app client together.
- `src/examples/decode-jwt.ts` - decodes and validates local JWT claims.
- `scripts/setup.ts` - creates lab user pool/app client.
- `scripts/seed.ts` - creates fixture user.
- `scripts/cleanup.ts` - deletes lab user pool.

## Operations covered

| Operation | Function | Notes |
|---|---|---|
| Create user pool | `createUserPool` | Email usernames, auto-verified email, baseline password policy. |
| Create app client | `createUserPoolClient` | Public client with password auth and refresh token flow. |
| Create pool bundle | `createUserPoolBundle` | Pool + client convenience setup. |
| Create user | `adminCreateUser` | Verified email user, suppressed invitation. |
| Get user | `adminGetUser` | Admin lookup by username/email. |
| List users | `listUsers` | Reads pool users for admin/testing flows. |
| Delete user | `adminDeleteUser` | Idempotent cleanup for missing users. |
| Delete pool | `deleteUserPool` | Idempotent cleanup for missing pools. |
| Decode JWT | `decodeJwtPayload` | Local decode only; does not verify signature. |
| Expiry check | `isJwtExpired` | Checks `exp` claim. |
| Claim assertion | `assertJwtClaims` | Requires token use and non-expired token. |

## Use cases

```ts
import { createUserPoolBundle, adminCreateUser, decodeJwtPayload, assertJwtClaims, deleteUserPool } from "./src/index.js";

const { userPoolId, clientId } = await createUserPoolBundle("app-users", "web");
await adminCreateUser(userPoolId, "ada@example.com");

const claims = decodeJwtPayload("header.payload.signature");
assertJwtClaims(claims, "access");
console.log({ userPoolId, clientId, sub: claims.sub });
await deleteUserPool(userPoolId);
```

## Runbook

1. Start Floci: `docker compose up -d`.
2. Check health: `pnpm run floci:health` from repo root.
3. Provision user pool/client: `pnpm setup`.
4. Seed fixture user: `pnpm seed`.
5. Run tests: `pnpm test`.
6. Cleanup user pool: `pnpm cleanup`.

## Gotchas

- `decodeJwtPayload` only decodes payload; production APIs must verify JWT signature against Cognito JWKS.
- Access tokens, ID tokens, and refresh tokens have different claims and use cases.
- App clients with secrets are not suitable for browser/mobile public clients.
- Admin-created users may need password challenge flows in real AWS.
- Configure password policy, MFA, account recovery, callback/logout URLs, token revocation, and hosted UI/domain for production.
- Never trust email/user claims without verifying issuer, audience/client ID, token use, expiry, and signature.

## Floci vs Real AWS

Floci support: **partial** for this lab. On real AWS, configure MFA, hosted UI/domain, app client OAuth flows, callback/logout URLs, advanced security features, SES/SMS messaging, token revocation, custom attributes, PreSignUp/PostConfirmation triggers, and CloudWatch alarms for auth failures. Real AWS also has JWKS signature verification, regional issuer URLs, quotas, password challenge flows, account recovery, SMS sandbox/costs, and security posture that local Floci does not fully model.
