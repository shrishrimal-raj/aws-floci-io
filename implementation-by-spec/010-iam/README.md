# 010 - IAM

> Enterprise identity and access management with trust policies, least-privilege permission policies, roles, managed policy attachments, validation, audit events, and dependency-safe cleanup.

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
- `src/use-cases/access.ts` - trust/policy builders, validation, audit events, role/policy create/attach/detach/delete, cleanup.
- `src/examples/basic-role.ts` - creates IAM role/policy attachment and deletes it.
- `src/examples/policy-document.ts` - single and multi-statement policy documents.
- `src/examples/role-policy-bundle.ts` - role + managed policy bundle and cleanup.
- `src/examples/lambda-least-privilege.ts` - tenant-aware Lambda execution role.
- `src/examples/cross-service-access.ts` - ECS task role for SQS + KMS with explicit deny.
- `src/examples/audit-access-review.ts` - policy validation and access review audit event.
- `src/examples/data-lifecycle-operator.ts` - scheduled cleanup role for S3/DynamoDB lifecycle jobs.
- `src/examples/observability-governance.ts` - CloudWatch Logs permissions, governance, no direct IAM cost note.
- `scripts/setup.ts` - creates lab role/policy.
- `scripts/seed.ts` - attaches fixture policy.
- `scripts/cleanup.ts` - detaches/deletes lab IAM resources.

## Operations covered

| Operation        | Function                                                         | Notes                                                           |
| ---------------- | ---------------------------------------------------------------- | --------------------------------------------------------------- |
| Trust policies   | `lambdaTrustPolicy`, `serviceTrustPolicy`                        | Lambda and generic AWS service principals.                      |
| ARN helper       | `resourceArn`                                                    | Builds example ARNs from service/region/account/resource.       |
| Policies         | `policyDocument`, `multiStatementPolicy`, `leastPrivilegePolicy` | Single, multi-statement, and tenant-aware least-privilege docs. |
| Validation       | `validatePolicyDocument`                                         | Flags wildcard actions/resources before deploy.                 |
| Audit            | `createIamAuditEvent`                                            | Structured change/review evidence.                              |
| Role lifecycle   | `createRole`, `getRole`, `deleteRole`                            | Create/read/delete roles.                                       |
| Policy lifecycle | `createPolicy`, `deletePolicy`                                   | Managed policy create/delete.                                   |
| Attachments      | `attachPolicy`, `detachPolicy`                                   | Managed policy attachment lifecycle.                            |
| Bundles          | `createRoleWithPolicy`, `cleanupRoleWithPolicy`                  | Create/cleanup role + policy dependency order.                  |

## Function examples

### Tenant-aware Lambda role

```ts
const doc = leastPrivilegePolicy({
  service: "dynamodb",
  actions: ["GetItem", "PutItem"],
  resourceArn: resourceArn(
    "dynamodb",
    "us-east-1",
    "table/orders",
    "123456789012",
  ),
  tenantId: "acme",
});
const bundle = await createRoleWithPolicy(
  "orders-lambda",
  "orders-ddb",
  doc,
  lambdaTrustPolicy,
);
```

### ECS task trust and explicit deny

```ts
const trust = serviceTrustPolicy("ecs-tasks.amazonaws.com");
const doc = multiStatementPolicy([
  {
    actions: ["sqs:ReceiveMessage", "sqs:DeleteMessage"],
    resources: [queueArn],
  },
  { effect: "Deny", actions: ["s3:DeleteBucket"], resources: ["*"] },
]);
```

### Access review

```ts
const findings = validatePolicyDocument(policyDocument(["s3:*"], ["*"]));
const audit = createIamAuditEvent({
  action: "AccessReview",
  principal: "security",
  resource: "orders-policy",
  outcome: findings.length ? "REVIEW" : "ALLOW",
});
```

## Real-world scenarios

- **Secure access patterns** - Lambda/ECS roles receive only actions/resources needed for one workload.
- **Multi-user SaaS** - use tenant tags, tenant-scoped ARNs, and app authorization; IAM is one layer, not full tenant auth.
- **Audit logging** - emit role/policy changes and access reviews to CloudTrail, CloudWatch, S3, or SIEM.
- **Error handling and retries** - IAM is eventually consistent in real AWS; retry role use/assume after creation.
- **Data lifecycle** - grant scheduled cleanup roles narrow delete/list permissions for expired S3/DynamoDB data only.
- **Event-driven processing** - execution roles for Lambda/SQS/EventBridge workers should separate read/write/publish permissions.
- **AWS integrations** - common principals: Lambda, ECS tasks, EC2, API Gateway, EventBridge Scheduler, Step Functions.
- **Monitoring** - watch CloudTrail IAM mutations, IAM Access Analyzer findings, Config rules, and unusual `PassRole` use.
- **Cost optimization** - IAM has no direct per-request cost; least privilege reduces blast radius and incident cost.
- **Compliance** - validate policies, require approvals, use permission boundaries/SCPs, avoid wildcards, review quarterly.

## Runbook

1. Start Floci: `docker compose up -d`.
2. Check health: `pnpm run floci:health` from repo root.
3. Provision IAM role/policy: `pnpm setup`.
4. Attach/verify fixture policy: `pnpm seed`.
5. Run tests: `pnpm test`.
6. Run examples: `pnpm exec tsx src/examples/<file>.ts`.
7. Cleanup IAM resources: `pnpm cleanup`.

## Testing guidance

- Cover trust policy builders, policy docs, validation, audit events, create/get role, create policy, attach/detach, bundle cleanup, and SDK error wrapping.
- Unit-test policy JSON before cloud deploy.
- Production apps should add IAM simulator/access-analyzer checks and denial-path tests.

## Production checklist

- [ ] No broad `Action: "*"` or `Resource: "*"` without documented exception.
- [ ] Trust policy principal scoped to exact service/account/provider.
- [ ] `iam:PassRole` restricted to approved roles/services.
- [ ] Permission boundaries/SCPs considered for high-risk teams.
- [ ] CloudTrail and Access Analyzer enabled.
- [ ] Policy changes tied to ticket/audit event.
- [ ] Cleanup detaches policies before deleting roles/policies.
- [ ] No long-lived user keys for workloads; use roles/STS.

## Gotchas

- Trust policy controls who can assume; permission policy controls what role can do.
- IAM propagates globally and can be eventually consistent.
- Delete order matters: detach managed policies before deleting policy/role.
- Resource policies, SCPs, permission boundaries, and session policies also affect final authorization.
- IAM local emulation cannot fully model AWS policy evaluation.

## Floci vs Real AWS

Floci support: **partial** for this lab. On real AWS, verify CloudTrail, Access Analyzer, permission boundaries, SCPs, external IDs, MFA, role session duration, policy validation, propagation delays, managed policy versions, service-linked roles, and organization controls.
