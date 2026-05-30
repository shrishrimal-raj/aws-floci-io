#!/usr/bin/env tsx
import {
  assertSecretNameAllowed,
  createJsonSecret,
  deleteSecret,
  getJsonSecret,
  secretAuditEvent,
  withSecretRetry,
} from "../use-cases/secrets.js";

interface DatabaseCredentials {
  username: string;
  password: string;
  host: string;
}

const tenantId = "tenant-a";
const name = `floci/${tenantId}/database/${Date.now()}`;

/**
 * Enterprise pattern: enforce namespace, retry transient reads, and audit access without logging secret values.
 */
try {
  assertSecretNameAllowed(name, `floci/${tenantId}/`);
  await createJsonSecret(name, { username: "app", password: "super-secret", host: "db.internal" });
  const credentials = await withSecretRetry(() => getJsonSecret<DatabaseCredentials>(name));
  console.log({
    connectedAs: credentials.username,
    host: credentials.host,
    audit: secretAuditEvent({ secretId: name, actor: "payments-api", action: "read", outcome: "success" }),
  });
} finally {
  await deleteSecret(name);
}
