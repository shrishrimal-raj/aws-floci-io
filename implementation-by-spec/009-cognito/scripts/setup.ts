#!/usr/bin/env tsx
import { createUserPool, createUserPoolClient } from "../src/use-cases/user-pools.js";
export const poolName = process.env.COGNITO_POOL_NAME ?? "floci-cognito-lab";
const userPoolId = await createUserPool(poolName);
const clientId = await createUserPoolClient(userPoolId, "web");
console.log(`Setup Cognito user pool ${userPoolId}`);
console.log(`Setup Cognito app client ${clientId}`);
