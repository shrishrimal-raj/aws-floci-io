#!/usr/bin/env tsx
import { createApplication, createEnvironment, createHostedJsonProfile } from "../src/use-cases/config.js";
export const appName = process.env.APPCONFIG_APP ?? "floci-appconfig-lab";
const appId = await createApplication(appName); await createEnvironment(appId,"dev"); await createHostedJsonProfile(appId,"flags");
console.log(`Setup AppConfig application ${appId}`);
