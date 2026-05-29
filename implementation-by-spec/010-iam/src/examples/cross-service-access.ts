#!/usr/bin/env tsx
import {
  cleanupRoleWithPolicy,
  createRoleWithPolicy,
  multiStatementPolicy,
  resourceArn,
  serviceTrustPolicy,
  validatePolicyDocument,
} from "../use-cases/access.js";

const suffix = Date.now();
const roleName = `floci-iam-ecs-task-${suffix}`;
const policyName = `floci-iam-ecs-task-policy-${suffix}`;

const document = multiStatementPolicy([
  {
    actions: [
      "sqs:ReceiveMessage",
      "sqs:DeleteMessage",
      "sqs:GetQueueAttributes",
    ],
    resources: [
      resourceArn("sqs", "us-east-1", "orders-worker", "000000000000"),
    ],
  },
  {
    actions: ["kms:Decrypt"],
    resources: [
      resourceArn("kms", "us-east-1", "key/orders-key", "000000000000"),
    ],
  },
  { effect: "Deny", actions: ["s3:DeleteBucket"], resources: ["*"] },
]);

const bundle = await createRoleWithPolicy(
  roleName,
  policyName,
  document,
  serviceTrustPolicy("ecs-tasks.amazonaws.com"),
);
console.log({
  integrationPattern:
    "ECS task consumes SQS and decrypts KMS-protected payloads with explicit deny guardrail",
  bundle,
  findings: validatePolicyDocument(document),
});
await cleanupRoleWithPolicy(bundle.roleName, bundle.policyArn);
