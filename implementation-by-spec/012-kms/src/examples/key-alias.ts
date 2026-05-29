#!/usr/bin/env tsx
import { createKeyWithAlias, scheduleKeyDeletion } from "../use-cases/crypto.js";

const bundle = await createKeyWithAlias(`alias/floci-kms-${Date.now()}`, "example key");
console.log(bundle);
await scheduleKeyDeletion(bundle.keyId);
