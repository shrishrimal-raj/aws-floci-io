#!/usr/bin/env tsx
import { readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { deleteUserPool } from "../src/use-cases/user-pools.js";

const stateFile = join(process.cwd(), ".floci-cognito.json");

type State = { userPoolId?: string; poolName?: string };

let state: State = {};
try {
  state = JSON.parse(await readFile(stateFile, "utf8")) as State;
} catch {
  state = { userPoolId: process.env.COGNITO_USER_POOL_ID, poolName: process.env.COGNITO_POOL_NAME };
}

await deleteUserPool(state.userPoolId);
await rm(stateFile, { force: true });

console.log(`Cleanup Cognito user pool ${state.userPoolId ?? "<none>"}`);
