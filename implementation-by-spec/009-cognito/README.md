# 009 - Cognito

User pools and JWT-based app auth.

## Quick start
```bash
pnpm setup
pnpm seed
pnpm test
pnpm cleanup
```

## Module
`src/use-cases/user-pools.ts` creates user pools/app clients, admin creates/gets/lists/deletes users, deletes pools, and decodes JWT payloads.

## Runbook
Create user pool/client, seed users, validate JWT claims in APIs, cleanup pool. Floci support: partial; real AWS needs MFA, hosted UI/domain, callback URLs, token revocation, password policies, and alarms.
