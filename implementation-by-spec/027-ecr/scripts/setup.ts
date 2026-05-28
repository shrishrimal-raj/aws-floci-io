#!/usr/bin/env tsx
import { createRepository, putExpireUntaggedPolicy } from "../src/use-cases/repositories.js";
export const repoName = process.env.ECR_REPO ?? "floci-ecr-lab";
await createRepository(repoName); await putExpireUntaggedPolicy(repoName);
console.log(`Setup ECR repository ${repoName}`);
