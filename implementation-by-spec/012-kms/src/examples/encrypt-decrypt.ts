#!/usr/bin/env tsx
import { createKey, decryptString, encryptString, scheduleKeyDeletion } from "../use-cases/crypto.js";
const keyId = await createKey("example key");
const ciphertext = await encryptString(keyId, "secret");
console.log(await decryptString(ciphertext));
await scheduleKeyDeletion(keyId);
