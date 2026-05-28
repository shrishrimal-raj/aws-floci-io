#!/usr/bin/env tsx
import { createAlias, createKey } from "../src/use-cases/crypto.js";
const keyId = await createKey("floci kms lab");
await createAlias("floci-kms-lab", keyId);
console.log(`Setup KMS key ${keyId}`);
