#!/usr/bin/env tsx
import {
  createIamAuditEvent,
  leastPrivilegePolicy,
  resourceArn,
  validatePolicyDocument,
} from "../use-cases/access.js";

const document = leastPrivilegePolicy({
  service: "logs",
  actions: ["CreateLogGroup", "CreateLogStream", "PutLogEvents"],
  resourceArn: resourceArn(
    "logs",
    "us-east-1",
    "log-group:/aws/lambda/orders-*:*",
    "000000000000",
  ),
});

console.log({
  observabilityPattern:
    "execution role can write CloudWatch Logs but cannot read secrets or mutate infrastructure",
  findings: validatePolicyDocument(document),
  audit: createIamAuditEvent({
    action: "AttachLoggingPolicy",
    principal: "platform-ci",
    resource: "orders-lambda-role",
    outcome: "ALLOW",
  }),
  costOptimization:
    "IAM itself has no direct per-request cost; least privilege reduces blast radius and incident cost",
  monitoring: [
    "CloudTrail CreateRole/CreatePolicy/AttachRolePolicy",
    "IAM Access Analyzer findings",
    "Config managed rules",
  ],
});
