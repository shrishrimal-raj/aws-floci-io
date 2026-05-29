#!/usr/bin/env tsx
import { createUserPoolBundle, deleteUserPool } from "../use-cases/user-pools.js";

const bundle = await createUserPoolBundle(`floci-cognito-bundle-${Date.now()}`, "web");
console.log(bundle);
await deleteUserPool(bundle.userPoolId);
