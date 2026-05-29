#!/usr/bin/env tsx
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { createUserPoolBundle } from "../src/use-cases/user-pools.js";

export const poolName = process.env.COGNITO_POOL_NAME ?? "floci-cognito-lab";
export const stateFile = join(process.cwd(), ".floci-cognito.json");

const bundle = await createUserPoolBundle(poolName, "web");
await mkdir(dirname(stateFile), { recursive: true });
await writeFile(stateFile, JSON.stringify({ ...bundle, poolName, createdAt: new Date().toISOString() }, null, 2));

console.log(`Setup Cognito user pool ${bundle.userPoolId}`);
console.log(`Setup Cognito app client ${bundle.clientId}`);
console.log(`State file: ${stateFile}`);
