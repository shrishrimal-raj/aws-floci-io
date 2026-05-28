#!/usr/bin/env tsx
import { createApplication } from "../src/use-cases/deployments.js";
export const appName = process.env.CODEDEPLOY_APP ?? "floci-codedeploy-lab";
await createApplication(appName);
console.log(`Setup CodeDeploy app ${appName}`);
