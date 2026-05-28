#!/usr/bin/env tsx
import { createJsonSecret } from "../src/use-cases/secrets.js";
export const secretName = process.env.SECRET_NAME ?? "floci/secrets-manager/lab";
const arn = await createJsonSecret(secretName, { username:"app", password:"local-dev" });
console.log(`Setup Secrets Manager secret ${arn}`);
