#!/usr/bin/env tsx
import {
  buildInvokeUrl,
  createMockRestApi,
  deleteRestApi,
  retryControlPlane,
} from "../use-cases/rest-api.js";

const primaryName = `floci-compliance-primary-${Date.now()}`;
const standbyName = `floci-compliance-standby-${Date.now()}`;
const created: Array<string | undefined> = [];

try {
  const primary = await retryControlPlane(() => createMockRestApi(primaryName));
  created.push(primary.restApiId);

  const standby = await retryControlPlane(() => createMockRestApi(standbyName));
  created.push(standby.restApiId);

  console.log({
    scenario: "compliance and disaster-recovery API runbook",
    primary: {
      restApiId: primary.restApiId,
      healthUrl: primary.invokeUrl,
    },
    standby: {
      restApiId: standby.restApiId,
      healthUrl: standby.invokeUrl,
    },
    failoverDrill: [
      "Run synthetic health check against primary /health.",
      "If primary fails SLO, route traffic to standby custom domain/base-path mapping in real AWS.",
      "Replay durable events from S3/SQS/EventBridge archive after failover.",
      "Record RTO/RPO and incident timeline in audit system.",
    ],
    complianceEvidence: {
      access: "Evidence: API policy, authorizer config, WAF ACL, TLS-only custom domain.",
      logging: "Evidence: CloudWatch access log group, retention policy, metric alarms, dashboards.",
      changeManagement: "Evidence: deployment ID, stage name, CI run ID, approver, rollback plan.",
      dataProtection: "Evidence: encryption settings for logs, backups, and downstream stores.",
    },
    backupPattern: [
      "Export OpenAPI definition and stage settings to version control/artifact storage.",
      "Keep reproducible infrastructure code for redeploying REST API resources.",
      "Use multi-account or multi-region standby only when business RTO/RPO requires it.",
    ],
    invokeUrlExample: buildInvokeUrl(primary.restApiId, primary.stageName, "/health"),
  });
} finally {
  await Promise.all(created.map((restApiId) => deleteRestApi(restApiId)));
}
