import { CAPSTONE_PROJECTS, evaluateAccess, eventRoute, generateEnterpriseBlueprint, retryPolicy, type TenantContext } from "../../../src/index.js";

/**
 * Real-world scenario: B2B SaaS tenant onboarding.
 * Demonstrates secure access, audit-ready blueprint, event-driven provisioning, and retry policy.
 */
export function buildTenantSaasOnboardingRunbook(context: TenantContext) {
  const finalProject = CAPSTONE_PROJECTS.find((project) => project.id === "010");
  if (!finalProject) throw new Error("final capstone project missing");

  const access = evaluateAccess(context, context.tenantId, "admin");
  const blueprint = generateEnterpriseBlueprint(finalProject, context);

  return {
    access,
    blueprintSummary: {
      project: blueprint.projectName,
      productionGrade: blueprint.productionGrade,
      missingConcerns: blueprint.missingConcerns,
      auditAction: blueprint.audit.action,
    },
    provisioningEvents: [
      eventRoute("saas.control-plane", "TenantCreated", ["tenant-config-lambda", "billing-queue", "welcome-email-topic"]),
      eventRoute("saas.control-plane", "TenantKmsKeyCreated", ["audit-log-lambda", "security-notification-topic"]),
    ],
    retry: retryPolicy({ maxAttempts: 4 }),
  };
}
