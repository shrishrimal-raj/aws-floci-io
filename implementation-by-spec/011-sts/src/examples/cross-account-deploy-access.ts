#!/usr/bin/env tsx
import {
  assumeRoleSession,
  buildScopedSessionPolicy,
  createExternalId,
  createStsAuditEvent,
  planCredentialRefresh,
  summarizeCredentials,
} from "../use-cases/credentials.js";

const roleArn = process.env.STS_DEPLOY_ROLE_ARN ?? "arn:aws:iam::111122223333:role/orders-prod-deploy";
const sessionName = "chg-1042-release-bot";
const sessionPolicy = buildScopedSessionPolicy([
  {
    effect: "Allow",
    actions: ["codedeploy:CreateDeployment", "codedeploy:GetDeployment", "ecs:DescribeServices", "cloudwatch:DescribeAlarms"],
    resources: ["*"],
  },
]);

const session = await assumeRoleSession(roleArn, sessionName, 900, undefined, {
  externalId: createExternalId("acme-retail", "prod-deploy"),
  sourceIdentity: "release-bot",
  sessionPolicy,
});

console.log({
  useCase: "Cross-account production deployment access",
  credentialSummary: summarizeCredentials(session.credentials, 300_000),
  refreshPlan: planCredentialRefresh(session.credentials),
  audit: createStsAuditEvent({
    operation: "AssumeRole",
    actor: "release-bot",
    targetArn: roleArn,
    sessionName,
    outcome: "ALLOW",
    ticketId: "CHG-1042",
    reason: "Deploy orders API through CodeDeploy with short-lived least-privilege credentials",
  }),
});
