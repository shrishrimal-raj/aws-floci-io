#!/usr/bin/env tsx
import { createProject } from "../src/use-cases/builds.js";
export const projectName = process.env.CODEBUILD_PROJECT ?? "floci-codebuild-lab";
await createProject(projectName);
console.log(`Setup CodeBuild project ${projectName}`);
