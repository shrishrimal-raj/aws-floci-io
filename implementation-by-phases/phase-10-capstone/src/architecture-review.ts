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

export function missingEnterpriseConcerns(project: CapstoneProject): ArchitectureConcern["category"][] {
  return ENTERPRISE_CONCERNS.filter(
    (concern) => !concern.requiredServices.some((service) => project.services.includes(service)),
  ).map((concern) => concern.category);
}

export function isProductionGrade(project: CapstoneProject): boolean {
  return missingEnterpriseConcerns(project).length === 0;
}

export function reviewSummary(project: CapstoneProject): string {
  const missing = missingEnterpriseConcerns(project);
  return missing.length
    ? `${project.name} missing: ${missing.join(", ")}`
    : `${project.name} covers enterprise production concerns`;
}
