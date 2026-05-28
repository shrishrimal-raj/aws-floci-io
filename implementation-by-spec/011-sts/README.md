# 011 - STS

Short-lived credentials via caller identity, AssumeRole, and federation.

## Quick start
```bash
pnpm setup
pnpm seed
pnpm test
pnpm cleanup
```

## Module
`src/use-cases/credentials.ts` gets caller identity, assumes roles, gets federation tokens, and checks credential expiry.

## Runbook
Verify caller, assume least-privilege role, refresh before expiry, never persist temp credentials. Floci support: partial; real AWS needs trust policies, external IDs, session tags, CloudTrail, and max-duration controls.
