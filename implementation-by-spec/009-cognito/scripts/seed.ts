#!/usr/bin/env tsx
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createManagedUsers } from "../src/use-cases/user-pools.js";

const stateFile = join(process.cwd(), ".floci-cognito.json");
const state = JSON.parse(await readFile(stateFile, "utf8")) as {
  userPoolId: string;
  clientId: string;
  poolName: string;
};

const users = await createManagedUsers(state.userPoolId, [
  { email: "admin@example.com", attributes: { "custom:role": "admin" } },
  { email: "analyst@example.com", attributes: { "custom:role": "analyst" } },
]);

await writeFile(stateFile, JSON.stringify({ ...state, users, seededAt: new Date().toISOString() }, null, 2));

console.log({
  scenario: "seeded Cognito fixture users",
  poolName: state.poolName,
  userPoolId: state.userPoolId,
  clientId: state.clientId,
  users,
});
