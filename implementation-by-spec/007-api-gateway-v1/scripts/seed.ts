#!/usr/bin/env tsx
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const stateFile = join(process.cwd(), ".floci-rest-api.json");
const state = JSON.parse(await readFile(stateFile, "utf8")) as {
  restApiId: string;
  stageName: string;
  invokeUrl: string;
  apiName: string;
};

console.log({
  scenario: "seeded API Gateway v1 mock /health route",
  apiName: state.apiName,
  restApiId: state.restApiId,
  stageName: state.stageName,
  invokeUrl: state.invokeUrl,
});
