#!/usr/bin/env tsx
import {
  checkoutStateMachineDefinition,
  countStates,
  createDomainEvent,
  createEventClients,
  eventPatternForTypes,
  sqsToStepFunctionsPipePlan,
} from "../../../src/index.js";

const clients = createEventClients();
console.log("Event-Driven Commerce Core demo");
console.log("clients:", Object.fromEntries(Object.entries(clients).map(([name, client]) => [name, client.constructor.name])));
console.log("sample event:", createDomainEvent({ source: "commerce.order", type: "OrderPlaced", tenantId: "tenant-a", subject: "order-1", detail: { total: 4200 } }));
console.log("order rule:", eventPatternForTypes(["OrderPlaced", "OrderFailed"]));
console.log("checkout saga states:", countStates(checkoutStateMachineDefinition()));
console.log("pipe plan:", sqsToStepFunctionsPipePlan("checkout-started", "arn:aws:sqs:us-east-1:123:checkout", "arn:aws:states:us-east-1:123:stateMachine:checkout", "arn:aws:iam::123:role/pipes"));
