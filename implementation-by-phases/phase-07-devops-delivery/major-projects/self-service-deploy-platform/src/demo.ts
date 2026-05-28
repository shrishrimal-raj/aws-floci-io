#!/usr/bin/env tsx
import {
  chooseDeploymentStrategy,
  createBlueGreenRollbackPolicy,
  createLambdaCanaryPlan,
  createNodeBuildSpec,
} from "../../../src/index.js";

const buildspec = createNodeBuildSpec({ appName: "orders-api", artifactFiles: ["dist/**/*", "appspec.yml"] });
const strategy = chooseDeploymentStrategy("ecs", true);
const canary = createLambdaCanaryPlan(10, 15);
const rollback = createBlueGreenRollbackPolicy("orders-api", ["orders-5xx-rate", "orders-latency-p95"]);

console.log("Self-Service Deploy Platform demo");
console.log(JSON.stringify({ strategy, buildspec, canary, rollback }, null, 2));
