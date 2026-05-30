import { CAPSTONE_PROJECTS, generateEnterpriseBlueprint, reviewSummary, type TenantContext } from "../../../src/index.js";

const context: TenantContext = {
  tenantId: "tenant-a",
  principalId: "architect-1",
  roles: ["admin"],
  requestId: "capstone-010-demo",
};

const finalProject = CAPSTONE_PROJECTS.find((project) => project.id === "010");
if (!finalProject) throw new Error("Project 010 not found");

const blueprint = generateEnterpriseBlueprint(finalProject, context);

console.log("Project 010: Final Enterprise-Grade Backend");
console.log(reviewSummary(finalProject));
console.log(JSON.stringify({
  productionGrade: blueprint.productionGrade,
  access: blueprint.access,
  eventRoutes: blueprint.events,
  lifecycle: blueprint.lifecycle,
  observabilityAlarms: blueprint.observability.alarms,
  costControls: blueprint.costControls,
  disasterRecovery: blueprint.disasterRecovery,
  complianceControls: blueprint.compliance.map((control) => control.control),
}, null, 2));
