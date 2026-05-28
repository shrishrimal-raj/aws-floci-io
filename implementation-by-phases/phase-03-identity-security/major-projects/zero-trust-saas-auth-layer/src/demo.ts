#!/usr/bin/env tsx
import { createSecurityClients, tenantTaskPolicy, trustPolicyForPrincipal, zeroTrustUserPoolPlan } from "../../../src/index.js";

const clients = createSecurityClients();
console.log("Zero-Trust SaaS Auth Layer demo");
console.log("clients:", Object.fromEntries(Object.entries(clients).map(([name, client]) => [name, client.constructor.name])));
console.log("user pool plan:", zeroTrustUserPoolPlan());
console.log("tenant policy:", JSON.stringify(tenantTaskPolicy("tenant-a", "arn:aws:dynamodb:us-east-1:123:table/taskflow", "arn:aws:s3:::taskflow"), null, 2));
console.log("trust policy:", JSON.stringify(trustPolicyForPrincipal("arn:aws:iam::111111111111:role/analytics", "external-tenant-a"), null, 2));
