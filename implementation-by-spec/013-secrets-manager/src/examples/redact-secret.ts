#!/usr/bin/env tsx
import { redactSecret, secretVersion } from "../use-cases/secrets.js";

const db = { username: "app", password: "super-secret", host: "db.local" };
console.log(redactSecret(db));
console.log(secretVersion("db/app", redactSecret(db), "v1"));
