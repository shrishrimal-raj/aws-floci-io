#!/usr/bin/env tsx
import { orderProcessingStateMachine, workflowObservabilityPlan, estimateStandardWorkflowCost } from "../index.js";

const definition = orderProcessingStateMachine({
  validateArn: "arn:aws:lambda:us-east-1:000000000000:function:validate-order",
  paymentArn: "arn:aws:lambda:us-east-1:000000000000:function:capture-payment",
  fulfillmentArn: "arn:aws:lambda:us-east-1:000000000000:function:fulfill-order",
  auditArn: "arn:aws:lambda:us-east-1:000000000000:function:audit-workflow",
  compensateArn: "arn:aws:lambda:us-east-1:000000000000:function:compensate-order",
});

console.log("order workflow ASL", JSON.parse(definition));
console.log("observability", workflowObservabilityPlan("order-processing"));
console.log("monthly cost estimate", estimateStandardWorkflowCost(100_000, 12));
