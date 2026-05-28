#!/usr/bin/env tsx
import { secretName } from "./setup.js";
import { putJsonSecretValue } from "../src/use-cases/secrets.js";
await putJsonSecretValue(secretName, { username:"app", password:"rotated-local-dev" });
console.log(`Seed Secrets Manager secret ${secretName}`);
