import { missingEnterpriseConcerns, type ArchitectureConcern } from "./architecture-review.js";
import type { CapstoneProject } from "./capstone-catalog.js";

export interface TenantContext {
  tenantId: string;
  principalId: string;
  roles: string[];
  requestId: string;
  region?: string;
}

export interface AccessDecision {
  allowed: boolean;
  reason: string;
  auditAction: string;
}

export interface AuditRecord {
  tenantId: string;
  principalId: string;
  action: string;
  resource: string;
  outcome: "allowed" | "denied" | "success" | "failure";
  requestId: string;
  at: string;
  reason?: string;
}

export interface RetryPolicy {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  retryableErrors: string[];
}

export interface EventRoute {
  source: string;
  detailType: string;
  busName: string;
  targets: string[];
  deadLetterQueue: string;
}

export interface DataLifecyclePolicy {
  dataset: string;
  hotDays: number;
  warmDays: number;
  retentionDays: number;
  deletionMode: "expire" | "legal-hold";
}

export interface ObservabilityPlan {
  service: string;
  metrics: string[];
  alarms: string[];
  logs: string[];
  traceSampleRate: number;
}

export interface CostControl {
  service: string;
  control: string;
  expectedImpact: string;
}

export interface DisasterRecoveryPlan {
  workload: string;
  rpoMinutes: number;
  rtoMinutes: number;
  strategy: "backup-restore" | "pilot-light" | "warm-standby" | "active-active";
  crossRegion: boolean;
}

export interface ComplianceControl {
  framework: "SOC2" | "HIPAA" | "PCI" | "GDPR";
  control: string;
  implementation: string;
}

export interface EnterpriseBlueprint {
  projectId: string;
  projectName: string;
  productionGrade: boolean;
  missingConcerns: ArchitectureConcern["category"][];
  access: AccessDecision;
  audit: AuditRecord;
  retryPolicy: RetryPolicy;
  events: EventRoute[];
  lifecycle: DataLifecyclePolicy[];
  observability: ObservabilityPlan;
  costControls: CostControl[];
  disasterRecovery: DisasterRecoveryPlan;
  compliance: ComplianceControl[];
}

/**
 * Checks tenant isolation and role-based access for capstone API calls.
 * Example: SaaS admin can deploy tenant-a release, but tenant-b caller is denied before Lambda/ECS work starts.
 */
export function evaluateAccess(context: TenantContext, resourceTenantId: string, requiredRole: string): AccessDecision {
  if (context.tenantId !== resourceTenantId) return { allowed: false, reason: "cross-tenant access denied", auditAction: "security.access.denied" };
  if (!context.roles.includes(requiredRole) && !context.roles.includes("admin")) return { allowed: false, reason: "missing required role", auditAction: "security.role.denied" };
  return { allowed: true, reason: "access granted", auditAction: "security.access.allowed" };
}

/**
 * Creates immutable audit records for allowed/denied and success/failure outcomes.
 * Example: write this shape to CloudWatch Logs, Firehose, or DynamoDB audit table for SOC2 evidence.
 */
export function createAuditRecord(context: TenantContext, action: string, resource: string, outcome: AuditRecord["outcome"], reason?: string): AuditRecord {
  return {
    tenantId: context.tenantId,
    principalId: context.principalId,
    action,
    resource,
    outcome,
    requestId: context.requestId,
    at: new Date().toISOString(),
    reason,
  };
}

/**
 * Defines exponential retry defaults for transient AWS integrations.
 * Example: EventBridge PutEvents and DynamoDB conditional writes retry throttles but not validation errors.
 */
export function retryPolicy(overrides: Partial<RetryPolicy> = {}): RetryPolicy {
  return {
    maxAttempts: 3,
    baseDelayMs: 100,
    maxDelayMs: 2_000,
    retryableErrors: ["ThrottlingException", "TooManyRequestsException", "InternalServerError", "ServiceUnavailable"],
    ...overrides,
  };
}

/**
 * Builds an EventBridge route with DLQ-first failure handling.
 * Example: order.created routes to billing Lambda, fulfillment SQS, analytics Firehose, and DLQ.
 */
export function eventRoute(source: string, detailType: string, targets: string[], busName = "enterprise-bus"): EventRoute {
  return {
    source,
    detailType,
    busName,
    targets,
    deadLetterQueue: `${detailType.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-dlq`,
  };
}

/**
 * Describes hot/warm/retained data lifecycle for cost and compliance.
 * Example: orders stay hot in DynamoDB for 30 days, warm in S3 IA, retained 2555 days for finance audits.
 */
export function dataLifecyclePolicy(dataset: string, retentionDays: number, hotDays = 30, warmDays = 365, deletionMode: DataLifecyclePolicy["deletionMode"] = "expire"): DataLifecyclePolicy {
  return { dataset, hotDays, warmDays, retentionDays, deletionMode };
}

/**
 * Creates CloudWatch/X-Ray observability plan for one workload.
 * Example: checkout service alarms on p95 latency, errors, DLQ depth, throttles, and budget burn.
 */
export function observabilityPlan(service: string): ObservabilityPlan {
  return {
    service,
    metrics: ["RequestCount", "ErrorRate", "P95Latency", "ThrottleCount", "DLQDepth", "EstimatedCharges"],
    alarms: [`${service}-high-error-rate`, `${service}-p95-latency`, `${service}-dlq-depth`, `${service}-budget-burn`],
    logs: ["application-json", "audit", "access", "security"],
    traceSampleRate: 0.1,
  };
}

/**
 * Lists practical AWS cost controls for capstone reviews.
 * Example: pair S3 lifecycle, DynamoDB on-demand/autoscaling, Lambda memory tuning, and OpenSearch right-sizing.
 */
export function costControls(project: CapstoneProject): CostControl[] {
  return project.services.flatMap((service) => {
    if (service === "S3") return [{ service, control: "Lifecycle to IA/Glacier by data age", expectedImpact: "lower storage cost for historical data" }];
    if (service === "DynamoDB") return [{ service, control: "On-demand for spiky workloads; autoscaling for predictable tenants", expectedImpact: "avoid over-provisioned capacity" }];
    if (service === "Lambda") return [{ service, control: "Memory tuning and reserved concurrency", expectedImpact: "reduce duration cost and protect downstream systems" }];
    if (service === "ECS") return [{ service, control: "Fargate right-sizing and scheduled scaling", expectedImpact: "match task spend to traffic" }];
    if (service === "OpenSearch") return [{ service, control: "Hot/warm indexes and retention policy", expectedImpact: "reduce search cluster storage pressure" }];
    return [];
  });
}

/**
 * Captures backup and disaster recovery target for enterprise workloads.
 * Example: production backend uses warm standby across regions with 15-minute RPO and 60-minute RTO.
 */
export function disasterRecoveryPlan(workload: string, strategy: DisasterRecoveryPlan["strategy"] = "warm-standby"): DisasterRecoveryPlan {
  const targets = strategy === "active-active" ? { rpoMinutes: 1, rtoMinutes: 5 } : strategy === "warm-standby" ? { rpoMinutes: 15, rtoMinutes: 60 } : { rpoMinutes: 60, rtoMinutes: 240 };
  return { workload, strategy, crossRegion: strategy !== "backup-restore", ...targets };
}

/**
 * Produces compliance controls mapped to practical AWS implementations.
 * Example: SOC2 evidence links KMS encryption, audit logs, least privilege IAM, and backup tests.
 */
export function complianceControls(framework: ComplianceControl["framework"] = "SOC2"): ComplianceControl[] {
  return [
    { framework, control: "Encryption at rest and in transit", implementation: "KMS keys for S3/DynamoDB/SNS/SQS plus TLS-only endpoints" },
    { framework, control: "Least privilege access", implementation: "IAM roles per workload and tenant-aware Cognito authorization" },
    { framework, control: "Auditability", implementation: "Structured audit logs with requestId, tenantId, principalId, action, outcome" },
    { framework, control: "Resilience evidence", implementation: "AWS Backup reports, restore drills, alarm history, and incident postmortems" },
  ];
}

/**
 * Generates one reviewable enterprise blueprint from a capstone catalog item.
 * Example: architecture review board can compare missing concerns, access, audit, events, lifecycle, ops, cost, DR, compliance.
 */
export function generateEnterpriseBlueprint(project: CapstoneProject, context: TenantContext): EnterpriseBlueprint {
  const access = evaluateAccess(context, context.tenantId, "admin");
  const productionGrade = missingEnterpriseConcerns(project).length === 0;
  return {
    projectId: project.id,
    projectName: project.name,
    productionGrade,
    missingConcerns: missingEnterpriseConcerns(project),
    access,
    audit: createAuditRecord(context, "capstone.blueprint.review", project.id, access.allowed ? "allowed" : "denied", access.reason),
    retryPolicy: retryPolicy(),
    events: [eventRoute("capstone.backend", "OrderCreated", ["billing-lambda", "fulfillment-queue", "analytics-firehose"])],
    lifecycle: [dataLifecyclePolicy("orders", 2_555), dataLifecyclePolicy("audit-logs", 2_555, 90, 365, "legal-hold")],
    observability: observabilityPlan(project.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")),
    costControls: costControls(project),
    disasterRecovery: disasterRecoveryPlan(project.name),
    compliance: complianceControls(),
  };
}
