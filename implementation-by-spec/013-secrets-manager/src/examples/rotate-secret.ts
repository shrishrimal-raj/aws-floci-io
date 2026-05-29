#!/usr/bin/env tsx
import { createJsonSecret, deleteSecret, rotateJsonSecret } from "../use-cases/secrets.js";

const name = `floci-secret-rotate-${Date.now()}`;
await createJsonSecret(name, { username: "app", password: "old" });
try {
  console.log(await rotateJsonSecret(name, { username: "app", password: "new" }));
} finally {
  await deleteSecret(name);
}
