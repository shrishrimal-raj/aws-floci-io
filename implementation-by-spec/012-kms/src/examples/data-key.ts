#!/usr/bin/env tsx
import { createKey, generateEnvelopeDataKey, scheduleKeyDeletion } from "../use-cases/crypto.js";

const keyId = await createKey("data key example");
try {
  const dataKey = await generateEnvelopeDataKey(keyId, 32);
  console.log({ plaintextBytes: dataKey.plaintextKey.byteLength, encryptedBytes: dataKey.encryptedKey.byteLength });
} finally {
  await scheduleKeyDeletion(keyId);
}
