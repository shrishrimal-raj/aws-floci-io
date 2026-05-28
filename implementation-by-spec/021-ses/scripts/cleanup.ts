#!/usr/bin/env tsx
import { deleteIdentity } from "../src/use-cases/email.js";
const email = process.env.SES_EMAIL ?? "sender@example.com";
await deleteIdentity(email);
console.log(`Cleanup SES identity ${email}`);
