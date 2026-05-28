#!/usr/bin/env tsx
import { createConfigurationSet, deleteConfigurationSet, sendEmailV2 } from "../use-cases/email-v2.js";
const set = `floci-${Date.now()}`;
await createConfigurationSet(set);
console.log(await sendEmailV2("sender@example.com",["sender@example.com"],"Hi","v2",set));
await deleteConfigurationSet(set);
