# 010 - IAM

Identity and access management: roles, trust policies, permission policies.

## Quick start
```bash
pnpm setup
pnpm seed
pnpm test
pnpm cleanup
```

## Module
`src/use-cases/access.ts` builds policies, creates roles/policies, attaches/detaches, and deletes resources.

## Runbook
Create least-privilege policy, create trusted role, attach policy, verify principal can assume/use, detach/delete. Floci support: partial; real AWS needs permission boundaries, SCP awareness, access analyzer, rotation, and audit.
