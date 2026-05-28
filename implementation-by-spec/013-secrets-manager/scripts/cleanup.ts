#!/usr/bin/env tsx
import { deleteSecret } from "../src/use-cases/secrets.js";
const secretName = process.env.SECRET_NAME ?? "floci/secrets-manager/lab";
await deleteSecret(secretName);
console.log(`Cleanup Secrets Manager secret ${secretName}`);
