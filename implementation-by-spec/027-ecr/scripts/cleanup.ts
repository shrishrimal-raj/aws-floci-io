#!/usr/bin/env tsx
import { deleteRepository } from "../src/use-cases/repositories.js";
const repoName = process.env.ECR_REPO ?? "floci-ecr-lab";
await deleteRepository(repoName);
console.log(`Cleanup ECR repository ${repoName}`);
