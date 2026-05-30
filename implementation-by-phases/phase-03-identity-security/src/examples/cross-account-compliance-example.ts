import { denyActions, evaluatePolicy, tenantTaskPolicy, trustPolicyForPrincipal } from "../iam-policy.js";
import { auditEvent, redactAssumedRoleSession, type AssumedRoleSession } from "../sts-acm-audit.js";

/**
 * Real-world compliance pattern: least-privilege tenant policy, ExternalId trust, redacted STS session audit.
 */
export function crossAccountComplianceExample() {
  const tenantPolicy = tenantTaskPolicy("tenant-a", "arn:aws:dynamodb:us-east-1:123:table/taskflow", "arn:aws:s3:::taskflow");
  tenantPolicy.Statement.push(denyActions(["kms:ScheduleKeyDeletion", "iam:CreateAccessKey"]));

  const session: AssumedRoleSession = {
    accessKeyId: "AKIA...",
    secretAccessKey: "secret",
    sessionToken: "token",
    expiration: new Date("2026-05-30T12:00:00.000Z"),
  };

  return {
    trustPolicy: trustPolicyForPrincipal("arn:aws:iam::111111111111:role/analytics", "external-tenant-a"),
    decision: evaluatePolicy(tenantPolicy, "s3:PutObject", "arn:aws:s3:::taskflow/tenants/tenant-a/report.csv"),
    audit: auditEvent({ tenantId: "tenant-a", actor: "analytics-job", action: "sts:AssumeRole", resource: "tenant-export-role", decision: "allow" }),
    redactedSession: redactAssumedRoleSession(session),
  };
}
