#!/usr/bin/env tsx
import { createJsonSecret, deleteSecret, getJsonSecret, putJsonSecretValue } from "../use-cases/secrets.js";
const name = `floci/example/${Date.now()}`;
await createJsonSecret(name, { password: "one" });
await putJsonSecretValue(name, { password: "two" });
console.log(await getJsonSecret(name));
await deleteSecret(name);
