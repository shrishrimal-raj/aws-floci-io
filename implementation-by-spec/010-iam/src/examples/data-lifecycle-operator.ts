#!/usr/bin/env tsx
import {
  cleanupRoleWithPolicy,
  createRoleWithPolicy,
  policyDocument,
  resourceArn,
  serviceTrustPolicy,
} from "../use-cases/access.js";

const suffix = Date.now();
const roleName = `floci-iam-lifecycle-${suffix}`;
const policyName = `floci-iam-lifecycle-policy-${suffix}`;

const document = policyDocument(
  ["s3:ListBucket", "s3:DeleteObject", "dynamodb:DeleteItem"],
  [
    resourceArn("s3", "", "tenant-archives"),
    resourceArn("s3", "", "tenant-archives/expired/*"),
    resourceArn("dynamodb", "us-east-1", "table/session-store", "000000000000"),
  ],
);

const bundle = await createRoleWithPolicy(
  roleName,
  policyName,
  document,
  serviceTrustPolicy("lambda.amazonaws.com"),
);
console.log({
  dataLifecyclePattern:
    "scheduled cleanup Lambda can delete only expired S3 objects and session rows",
  bundle,
  productionControls: [
    "EventBridge Scheduler",
    "CloudTrail",
    "S3 Object Lock where required",
    "approval ticket for destructive access",
  ],
});
await cleanupRoleWithPolicy(bundle.roleName, bundle.policyArn);
