import { fileURLToPath } from "node:url";
import { backupDrComplianceExample } from "../../../../src/examples/backup-dr-compliance-example.js";
import { finopsGovernanceExample } from "../../../../src/examples/finops-governance-example.js";
import { sloIncidentExample } from "../../../../src/examples/slo-incident-example.js";
import { commandCenterSnapshot } from "../../../../src/enterprise-patterns.js";

/**
 * End-to-end enterprise command center scenario:
 * 1. SLO health and incident alerting
 * 2. FinOps forecast, anomaly, tag governance
 * 3. Backup/DR compliance posture
 * 4. Executive snapshot for dashboard/API response
 */
export function enterpriseOpsCommandCenterScenario() {
  const incident = sloIncidentExample();
  const finops = finopsGovernanceExample();
  const resilience = backupDrComplianceExample();
  const snapshot = commandCenterSnapshot({
    slo: { service: "checkout-api", targetAvailability: 99.9, totalRequests: 1_000_000, failedRequests: 1_500 },
    alarms: [{ name: "checkout-5xx", state: "ALARM", reason: "5xx > 1%" }],
    dailyCosts: [120, 135, 150, 165],
    budgetUsd: 3_500,
    costs: [
      { service: "Lambda", amountUsd: 42.5, tags: { Project: "taskflow" } },
      { service: "DynamoDB", amountUsd: 125, tags: { Project: "taskflow" } },
      { service: "S3", amountUsd: 18, tags: {} },
    ],
  });

  return { snapshot, incident, finops, resilience };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  console.log(JSON.stringify(enterpriseOpsCommandCenterScenario(), null, 2));
}
