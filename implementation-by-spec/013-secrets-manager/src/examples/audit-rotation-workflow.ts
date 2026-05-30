#!/usr/bin/env tsx
import { createJsonSecret, deleteSecret, rotateJsonSecret, secretAuditEvent } from "../use-cases/secrets.js";

const name = `floci/rotation/api-key/${Date.now()}`;

/**
 * Enterprise pattern: rotate API key, emit audit event, and only log redacted previous value.
 */
try {
  await createJsonSecret(name, { apiKey: "old-key", endpoint: "https://partner.example.com" });
  const rotated = await rotateJsonSecret(name, { apiKey: "new-key", endpoint: "https://partner.example.com" });
  console.log({
    rotation: { name: rotated.name, previous: rotated.previous, versionId: rotated.versionId },
    audit: secretAuditEvent({ secretId: name, actor: "rotation-job", action: "rotate", outcome: "success" }),
  });
} finally {
  await deleteSecret(name);
}
