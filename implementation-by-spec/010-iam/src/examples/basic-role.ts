#!/usr/bin/env tsx
import {
  attachPolicy,
  createPolicy,
  createRole,
  deletePolicy,
  deleteRole,
  detachPolicy,
  getRole,
  policyDocument,
} from "../use-cases/access.js";
const role = `floci-iam-example-${Date.now()}`;
const policyArn = await createPolicy(
  `${role}-policy`,
  policyDocument(["s3:GetObject"]),
);
console.log(await createRole(role));
console.log(await getRole(role));
await attachPolicy(role, policyArn);
await detachPolicy(role, policyArn);
await deletePolicy(policyArn);
await deleteRole(role);
