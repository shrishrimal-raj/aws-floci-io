#!/usr/bin/env tsx
import {
  invokeBatchJson,
  invokeEvent,
  invokeJson,
} from "../src/use-cases/functions.js";
import {
  apiFunctionName,
  complianceFunctionName,
  workerFunctionName,
} from "./setup.js";

const apiResult = await invokeJson(apiFunctionName, {
  action: "CreateOrder",
  tenantId: "acme-retail",
  orderId: "ord-seed-1001",
  traceId: "trace-seed-api-1001",
});

const workerAccepted = await invokeEvent(workerFunctionName, {
  source: "aws.sqs",
  detailType: "OrderPaid",
  detail: {
    tenantId: "acme-retail",
    orderId: "ord-seed-1001",
    paymentId: "pay-seed-1",
  },
});

const complianceBatch = await invokeBatchJson(complianceFunctionName, [
  { task: "scan-untagged-resources", tenantId: "regulated-co" },
  { task: "expire-old-evidence", tenantId: "regulated-co" },
]);

console.log({ apiResult, workerAccepted, complianceBatch });
