#!/usr/bin/env tsx
import {
  buildOrdersApiDeliveryExample,
  buildPaymentsComplianceDeliveryExample,
  buildSaasWorkerDeliveryExample,
  createCrossAccountPromotionPlan,
  createSelfServicePipeline,
  evaluatePipelineGuardrails,
  nextPipelineAction,
} from "../../../src/index.js";

const orders = buildOrdersApiDeliveryExample();
const payments = buildPaymentsComplianceDeliveryExample();
const worker = buildSaasWorkerDeliveryExample();

const platformPipeline = createSelfServicePipeline("github.com/acme/orders-api", "orders-api");
const nextAction = nextPipelineAction(platformPipeline, ["Source", "Build"]);
const productionGuardrails = evaluatePipelineGuardrails({
  environment: "prod",
  approvers: ["platform-owner", "service-owner"],
  securityScanPassed: true,
  changeTicket: "CHG-1042",
  alarmState: "OK",
});
const promotion = createCrossAccountPromotionPlan("orders-api", ["dev", "stage", "prod"]);

console.log("Self-Service Deploy Platform demo");
console.log(
  JSON.stringify(
    {
      useCases: [orders, payments, worker],
      platformOperatorView: {
        nextAction,
        productionGuardrails,
        promotion,
      },
    },
    null,
    2,
  ),
);
