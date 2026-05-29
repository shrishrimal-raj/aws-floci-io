#!/usr/bin/env tsx
import {
  cleanupRoleWithPolicy,
  createIamAuditEvent,
  createRoleWithPolicy,
  leastPrivilegePolicy,
  lambdaTrustPolicy,
  resourceArn,
  validatePolicyDocument,
} from "../use-cases/access.js";

const suffix = Date.now();
const roleName = `floci-iam-orders-lambda-${suffix}`;
const policyName = `floci-iam-orders-policy-${suffix}`;

const document = leastPrivilegePolicy({
  service: "dynamodb",
  actions: ["GetItem", "PutItem", "UpdateItem"],
  resourceArn: resourceArn(
    "dynamodb",
    "us-east-1",
    "table/orders",
    "000000000000",
  ),
  tenantId: "acme-retail",
});

const findings = validatePolicyDocument(document);
const bundle = await createRoleWithPolicy(
  roleName,
  policyName,
  document,
  lambdaTrustPolicy,
);

console.log({
  useCase:
    "Lambda execution role can access only orders table actions and tenant-tagged sessions",
  bundle,
  findings,
  audit: createIamAuditEvent({
    action: "CreateLeastPrivilegeLambdaRole",
    principal: "platform-engineer",
    resource: roleName,
    outcome: findings.length ? "REVIEW" : "ALLOW",
    ticketId: "SEC-1001",
  }),
});

await cleanupRoleWithPolicy(bundle.roleName, bundle.policyArn);
