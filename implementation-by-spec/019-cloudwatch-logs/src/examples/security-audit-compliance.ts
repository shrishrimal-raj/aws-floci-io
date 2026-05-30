#!/usr/bin/env tsx
import {
  buildLogAuditEntry,
  enterpriseApplicationLog,
  logDisasterRecoveryPlan,
  logGroupReadPolicy,
  logLifecyclePlan,
  redactSensitiveFields,
  subscriptionFilterPlan,
} from "../index.js";

const lifecycle = logLifecyclePlan("identity-api", "prod", true);

console.log(
  JSON.stringify(
    {
      lifecycle,
      secureLog: enterpriseApplicationLog("WARN", "auth.failed", {
        service: "identity-api",
        tenantId: "bank-a",
        userId: "user-1001",
        authorization: "Bearer secret",
        ipAddress: "203.0.113.10",
      }),
      redactedPayload: redactSensitiveFields({ username: "alice", password: "pw", creditCard: "4111111111111111" }),
      readPolicy: logGroupReadPolicy(lifecycle.logGroupName, "us-east-1", "123456789012", "arn:aws:iam::123456789012:role/security-auditor"),
      firehoseArchive: subscriptionFilterPlan({
        filterName: "identity-audit-to-firehose",
        logGroupName: lifecycle.logGroupName,
        destinationArn: "arn:aws:firehose:us-east-1:123456789012:deliverystream/security-audit-logs",
        filterPattern: "",
        targetService: "firehose",
        roleArn: "arn:aws:iam::123456789012:role/logs-to-firehose",
      }),
      audit: buildLogAuditEntry({
        eventId: "evt-retention-change",
        actor: "platform-security",
        action: "PutRetentionPolicy",
        logGroupName: lifecycle.logGroupName,
        outcome: "ALLOW",
        metadata: { retentionDays: lifecycle.retentionDays, compliance: "sox-pci" },
      }),
      disasterRecovery: logDisasterRecoveryPlan("identity-api", "prod", "us-west-2"),
    },
    null,
    2
  )
);
