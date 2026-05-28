#!/usr/bin/env tsx
import { deleteProject } from "../src/use-cases/builds.js";
const projectName = process.env.CODEBUILD_PROJECT ?? "floci-codebuild-lab";
await deleteProject(projectName);
console.log(`Cleanup CodeBuild project ${projectName}`);
