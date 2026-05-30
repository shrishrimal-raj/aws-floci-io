import type { CapstoneProject } from "./capstone-catalog.js";

export interface ArchitectureConcern {
  category: "compute" | "data" | "events" | "security" | "observability" | "delivery";
  requiredServices: string[];
}

export const ENTERPRISE_CONCERNS: ArchitectureConcern[] = [
  { category: "compute", requiredServices: ["Lambda", "ECS"] },
  { category: "data", requiredServices: ["DynamoDB", "S3"] },
  { category: "events", requiredServices: ["SQS", "SNS"] },
  { category: "security", requiredServices: ["Cognito", "KMS"] },
  { category: "observability", requiredServices: ["CloudWatch"] },
  { category: "delivery", requiredServices: ["CodeBuild"] },
];

/**
 * Lists missing enterprise categories by checking required service coverage.
 * Example: object storage API has compute/data but misses events, security, observability, and delivery.
 */
export function missingEnterpriseConcerns(project: CapstoneProject): ArchitectureConcern["category"][] {
  return ENTERPRISE_CONCERNS.filter(
    (concern) => !concern.requiredServices.some((service) => project.services.includes(service)),
  ).map((concern) => concern.category);
}

/**
 * Returns true when project covers compute, data, events, security, observability, and delivery.
 * Example: final capstone passes because it integrates Lambda/ECS, DynamoDB/S3, SQS/SNS, Cognito/KMS, CloudWatch, CodeBuild.
 */
export function isProductionGrade(project: CapstoneProject): boolean {
  return missingEnterpriseConcerns(project).length === 0;
}

/**
 * Produces a concise human review message for architecture gates.
 * Example: CI job can print missing categories before allowing final capstone submission.
 */
export function reviewSummary(project: CapstoneProject): string {
  const missing = missingEnterpriseConcerns(project);
  return missing.length
    ? `${project.name} missing: ${missing.join(", ")}`
    : `${project.name} covers enterprise production concerns`;
}
