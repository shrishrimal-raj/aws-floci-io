#!/usr/bin/env tsx
import { verifyEmail } from "../src/use-cases/email.js";
export const email = process.env.SES_EMAIL ?? "sender@example.com";
await verifyEmail(email);
console.log(`Setup SES identity ${email}`);
