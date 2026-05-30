import { budgetVariancePercent, costOptimizationRecommendation, forecastMonthlyCost, groupCostByTag, tagDriftReport } from "../ops-cost.js";
import { detectCostAnomalies, tagComplianceTicket } from "../enterprise-patterns.js";

/**
 * Real-world FinOps pattern: forecast spend, find anomalies, validate allocation tags, and create remediation payload.
 */
export function finopsGovernanceExample() {
  const costs = [
    { service: "Lambda", amountUsd: 42.5, tags: { Project: "taskflow", CostCenter: "eng" } },
    { service: "DynamoDB", amountUsd: 125, tags: { Project: "taskflow", CostCenter: "eng" } },
    { service: "S3", amountUsd: 18, tags: {} },
  ];
  const forecastUsd = forecastMonthlyCost([120, 135, 150, 165]);
  const budgetUsd = 3_500;
  const untaggedCostUsd = groupCostByTag(costs, "Project")["<untagged>"] ?? 0;

  const drift = tagDriftReport(
    [{ arn: "arn:aws:s3:::audit-bucket", tags: { Environment: "prod", Owner: "ops", CostCenter: "1001", Project: "security" } }],
    [{ arn: "arn:aws:s3:::audit-bucket", tags: { Environment: "prod", Owner: "ops", CostCenter: undefined, Project: "security" } }]
  );

  return {
    forecastUsd,
    budgetVariancePercent: budgetVariancePercent(forecastUsd, budgetUsd),
    costByProject: groupCostByTag(costs, "Project"),
    anomalies: detectCostAnomalies(costs, { Lambda: 20, DynamoDB: 80, S3: 20 }),
    recommendation: costOptimizationRecommendation({ forecastUsd, budgetUsd, untaggedCostUsd }),
    drift,
    ticket: tagComplianceTicket({ arn: "arn:aws:s3:::audit-bucket", tags: { Environment: "prod", Owner: "ops" } }, ["CostCenter", "Project"]),
  };
}
