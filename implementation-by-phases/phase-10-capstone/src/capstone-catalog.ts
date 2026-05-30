export interface CapstoneProject {
  id: string;
  name: string;
  services: string[];
  focus: "storage" | "events" | "serverless" | "security" | "data" | "containers" | "observability" | "delivery" | "enterprise";
}

export const CAPSTONE_PROJECTS: CapstoneProject[] = [
  { id: "001", name: "Basic Object Storage API", focus: "storage", services: ["S3", "API Gateway", "Lambda"] },
  { id: "002", name: "Queue Based Order System", focus: "events", services: ["SQS", "SNS", "DynamoDB", "Lambda"] },
  { id: "003", name: "Serverless CRUD API", focus: "serverless", services: ["API Gateway", "Lambda", "DynamoDB", "CloudWatch Logs"] },
  { id: "004", name: "Event Driven Ecommerce Backend", focus: "events", services: ["EventBridge", "DynamoDB Streams", "SQS", "SNS"] },
  { id: "005", name: "Authenticated SaaS API", focus: "security", services: ["Cognito", "IAM", "Secrets Manager", "KMS"] },
  { id: "006", name: "Data Pipeline Platform", focus: "data", services: ["Kinesis", "Glue", "Athena", "OpenSearch"] },
  { id: "007", name: "Containerized Microservices Platform", focus: "containers", services: ["ECS", "ECR", "ALB", "Cloud Map"] },
  { id: "008", name: "Observability and Ops Platform", focus: "observability", services: ["CloudWatch", "AWS Config", "Backup", "Cost Explorer"] },
  { id: "009", name: "CI/CD Release Platform", focus: "delivery", services: ["CodeBuild", "CodeDeploy", "CloudWatch Alarms"] },
  { id: "010", name: "Final Capstone Production Backend", focus: "enterprise", services: ["S3", "SQS", "SNS", "Lambda", "DynamoDB", "Cognito", "ECS", "CloudWatch", "CodeBuild", "KMS"] },
];

/**
 * Returns sorted unique AWS services covered by one or more capstones.
 * Example: curriculum dashboard shows students which services they practiced across all projects.
 */
export function serviceCoverage(projects: CapstoneProject[] = CAPSTONE_PROJECTS): string[] {
  return [...new Set(projects.flatMap((project) => project.services))].sort();
}

/**
 * Recommends projects for a learning goal and always includes final enterprise integration.
 * Example: event-driven learner receives queue/order, ecommerce, and final backend capstones.
 */
export function recommendCapstones(goal: CapstoneProject["focus"]): CapstoneProject[] {
  return CAPSTONE_PROJECTS.filter((project) => project.focus === goal || project.focus === "enterprise");
}

/**
 * Scores presence of compute, data, operations, and security dimensions from 0-4.
 * Example: architecture review quickly identifies if a capstone lacks security or observability practice.
 */
export function productionReadinessScore(project: CapstoneProject): number {
  const hasCompute = project.services.some((service) => ["Lambda", "ECS"].includes(service));
  const hasData = project.services.some((service) => ["DynamoDB", "S3", "OpenSearch", "Kinesis"].includes(service));
  const hasOps = project.services.some((service) => service.includes("CloudWatch") || service === "AWS Config" || service === "Cost Explorer");
  const hasSecurity = project.services.some((service) => ["Cognito", "IAM", "KMS", "Secrets Manager"].includes(service));
  return [hasCompute, hasData, hasOps, hasSecurity].filter(Boolean).length;
}
