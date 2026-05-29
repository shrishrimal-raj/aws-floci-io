#!/usr/bin/env tsx
import { readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { deleteRestApi } from "../src/use-cases/rest-api.js";

const stateFile = join(process.cwd(), ".floci-rest-api.json");

type State = { restApiId?: string; apiName?: string };

let state: State = {};
try {
  state = JSON.parse(await readFile(stateFile, "utf8")) as State;
} catch {
  state = { restApiId: process.env.REST_API_ID, apiName: process.env.REST_API_NAME };
}

await deleteRestApi(state.restApiId);
await rm(stateFile, { force: true });

console.log(`Cleanup API Gateway v1 REST API ${state.restApiId ?? "<none>"}`);
