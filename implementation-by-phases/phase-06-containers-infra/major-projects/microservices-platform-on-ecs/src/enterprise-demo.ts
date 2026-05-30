#!/usr/bin/env tsx
import { buildEksIrsaComplianceExample } from "../../../src/examples/eks-irsa-compliance.example.js";
import { buildEventDrivenOperationsExample } from "../../../src/examples/event-driven-operations.example.js";
import { buildSecureOrdersServiceExample } from "../../../src/examples/secure-ecs-platform.example.js";

const secureOrders = buildSecureOrdersServiceExample();
const operations = await buildEventDrivenOperationsExample();
const eks = buildEksIrsaComplianceExample();

console.log("Enterprise container platform demo");
console.log("orders deploy commands:", secureOrders.imageBuild.length);
console.log("orders compliance:", secureOrders.compliance.map((finding) => `${finding.control}:${finding.status}`).join(", "));
console.log("orders estimated monthly cost:", secureOrders.monthlyCostUsd);
console.log("event detail type:", operations.deploymentEvent.DetailType);
console.log("dashboard bytes:", operations.dashboardBody.length);
console.log("DR steps:", operations.drRunbook.length);
console.log("EKS service account:", (eks.serviceAccount.metadata as { name: string }).name);
console.log("EKS audit action:", eks.audit.action);
