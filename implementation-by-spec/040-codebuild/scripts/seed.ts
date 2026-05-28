#!/usr/bin/env tsx
import { projectName } from "./setup.js";
import { startBuild } from "../src/use-cases/builds.js";
await startBuild(projectName);
console.log(`Seed CodeBuild build ${projectName}`);
