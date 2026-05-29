# 010 - IAM

> Identity and access management with trust policies, permission policies, roles, managed policy attachments, and dependency-safe cleanup.

## Quick start

```bash
docker compose up -d
pnpm install
cd implementation-by-spec/010-iam
pnpm setup
pnpm seed
pnpm test
pnpm cleanup
```

## Module

- `src/client.ts` - IAM SDK v3 client for Floci (`http://localhost:4566`).
- `src/use-cases/access.ts` - policy builders, Lambda trust policy, role/policy create, attach/detach, bundled setup, cleanup.
- `src/examples/basic-role.ts` - creates IAM role/policy attachment and deletes it.
- `src/examples/policy-document.ts` - builds single and multi-statement policy documents.
- `src/examples/role-policy-bundle.ts` - creates role + managed policy bundle and cleans it up.
- `scripts/setup.ts` - creates lab role/policy.
- `scripts/seed.ts` - attaches fixture policy.
- `scripts/cleanup.ts` - detaches/deletes lab IAM resources.

## Operations covered

| Operation | Function | Notes |
|---|---|---|
| Lambda trust policy | `lambdaTrustPolicy` | Allows `lambda.amazonaws.com` to assume role. |
| Policy document | `policyDocument` | Single allow statement for actions/resources. |
| Multi-statement policy | `multiStatementPolicy` | Multiple allow/deny statements. |
| Create role | `createRole` | Uses trust policy; returns existing ARN if role exists. |
| Get role | `getRole` | Reads role metadata/ARN. |
| Create policy | `createPolicy` | Creates managed policy from JSON document. |
| Attach policy | `attachPolicy` | Attaches managed policy to role. |
| Bundle setup | `createRoleWithPolicy` | Creates role, policy, and attachment together. |
| Detach policy | `detachPolicy` | Idempotent detach for cleanup. |
| Delete policy | `deletePolicy` | Idempotent managed policy deletion. |
| Delete role | `deleteRole` | Idempotent role deletion. |
| Bundle cleanup | `cleanupRoleWithPolicy` | Detach → delete policy → delete role order. |

## Use cases

```ts
import { createRoleWithPolicy, cleanupRoleWithPolicy, policyDocument } from "./src/index.js";

const bundle = await createRoleWithPolicy(
  "orders-lambda-role",
  "orders-read-s3",
  policyDocument(["s3:GetObject"], ["arn:aws:s3:::orders-bucket/*"])
);

console.log(bundle.roleArn);
await cleanupRoleWithPolicy(bundle.roleName, bundle.policyArn);
```

## Runbook

1. Start Floci: `docker compose up -d`.
2. Check health: `pnpm run floci:health` from repo root.
3. Provision IAM role/policy: `pnpm setup`.
4. Attach/verify fixture policy: `pnpm seed`.
5. Run tests: `pnpm test`.
6. Cleanup IAM resources: `pnpm cleanup`.

## Gotchas

- Least privilege means scope actions and resources; avoid `Action: "*"` and `Resource: "*"` except lab/demo.
- Trust policy controls who can assume role; permission policy controls what role can do.
- Delete order matters: detach managed policies before deleting policies/roles.
- IAM changes are eventually consistent in real AWS; retry assume/use operations after creation.
- Managed policy versions and inline policies add extra cleanup/rotation considerations.
- Production orgs may also enforce SCPs, permission boundaries, session policies, and resource policies.

## Floci vs Real AWS

Floci support: **partial** for this lab. On real AWS, use IAM Access Analyzer, CloudTrail audit, permission boundaries, SCP awareness, role session duration, external IDs for third-party access, MFA for sensitive access, policy validation, and credential rotation. Real AWS also has global IAM propagation delays, policy evaluation complexity, managed policy version limits, service-linked roles, and organization-level controls that local Floci does not fully model.
