#!/usr/bin/env tsx
import { deleteApplication } from "../src/use-cases/deployments.js";
const appName = process.env.CODEDEPLOY_APP ?? "floci-codedeploy-lab";
await deleteApplication(appName);
console.log(`Cleanup CodeDeploy app ${appName}`);
