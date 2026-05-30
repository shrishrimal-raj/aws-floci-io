#!/usr/bin/env tsx
import { CAPSTONE_PROJECTS, productionReadinessScore, recommendCapstones, serviceCoverage } from "../../../src/index.js";
import { buildIncidentResponseWorkflow } from "./incident-response-workflow.js";
import { buildRegulatedDataOpsPlan } from "./regulated-data-ops.js";
import { buildTenantSaasOnboardingRunbook } from "./tenant-saas-platform.js";

const finalProject = CAPSTONE_PROJECTS.find((project) => project.id === "010");
const context = { tenantId: "tenant-a", principalId: "admin-1", roles: ["admin", "incident-admin"], requestId: "req-001", region: "us-east-1" };

console.log("Final Enterprise Backend capstone demo");
console.log(JSON.stringify({
  projectCount: CAPSTONE_PROJECTS.length,
  serviceCoverage: serviceCoverage(),
  eventTrack: recommendCapstones("events").map((project) => project.name),
  finalReadinessScore: finalProject ? productionReadinessScore(finalProject) : 0,
  tenantOnboarding: buildTenantSaasOnboardingRunbook(context),
  regulatedDataOps: buildRegulatedDataOpsPlan(),
  incidentResponse: buildIncidentResponseWorkflow(context, "inc-2026-001"),
}, null, 2));
