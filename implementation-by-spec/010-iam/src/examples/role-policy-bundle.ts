#!/usr/bin/env tsx
import {
  cleanupRoleWithPolicy,
  createRoleWithPolicy,
  policyDocument,
} from "../use-cases/access.js";

const suffix = Date.now();
const roleName = `floci-iam-role-${suffix}`;
const policyName = `floci-iam-policy-${suffix}`;

const bundle = await createRoleWithPolicy(
  roleName,
  policyName,
  policyDocument(["logs:CreateLogGroup"], ["*"]),
);
console.log(bundle);
await cleanupRoleWithPolicy(bundle.roleName, bundle.policyArn);
