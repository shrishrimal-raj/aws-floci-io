# 012 - KMS

Encryption keys, aliases, data keys, and envelope encryption primitives.

## Quick start
```bash
pnpm setup
pnpm seed
pnpm test
pnpm cleanup
```

## Module
`src/use-cases/crypto.ts` creates keys/aliases, encrypts/decrypts strings, generates data keys, describes keys, schedules deletion.

## Runbook
Create CMK, create alias, encrypt/decrypt or generate data key, schedule deletion when done. Real AWS: use key policies, rotation, grants, CloudTrail, multi-region keys, and least-privilege decrypt access.
