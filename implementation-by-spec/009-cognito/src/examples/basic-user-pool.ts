#!/usr/bin/env tsx
import { adminCreateUser, createUserPool, createUserPoolClient, deleteUserPool, listUsers } from "../use-cases/user-pools.js";
const poolId = await createUserPool(`floci-cognito-example-${Date.now()}`);
await createUserPoolClient(poolId);
await adminCreateUser(poolId, "ada@example.com");
console.log(await listUsers(poolId));
await deleteUserPool(poolId);
